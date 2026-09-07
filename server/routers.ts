import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { auditFindings, projects } from "../drizzle/schema";
import { getProject, getApproval, insertApproval, insertExecution, insertFinding, insertProject, insertTask, listApprovals, listExecutions, listFindings, listProjects, listTasks, resolveApproval, saveMemory, listMemory } from "./db";
import { routeLocalModel } from "./aion/modelRouter";
import { resolveWorkspacePath, runSafeCommand } from "./aion/safeExecutor";

const SAFE_ROOTS = ["/home/ubuntu", "/tmp/aion-workspaces"];
const blockedNames = new Set([".env", ".env.local", ".ssh", ".git/config"]);
const adminProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario puede aprobar o ejecutar operaciones de riesgo." }); return next(); });

const toolCatalog = [
  { name: "filesystem", description: "Lectura y escritura acotada al workspace", inputSchema: { path: "string", operation: "read|write" }, riskLevel: "medium", permissions: ["workspace.read", "workspace.write"], status: "available" },
  { name: "terminal", description: "Ejecución restringida de comandos del proyecto con aprobación", inputSchema: { command: "string", cwd: "workspace", approvalId: "number" }, riskLevel: "high", permissions: ["workspace.exec"], status: "available" },
  { name: "git", description: "Inspección de estado y diffs Git", inputSchema: { path: "string", operation: "status|diff" }, riskLevel: "medium", permissions: ["workspace.read", "git.read"], status: "available" },
  { name: "tests", description: "Ejecución de pruebas del proyecto", inputSchema: { command: "pnpm test|pytest", cwd: "workspace" }, riskLevel: "high", permissions: ["workspace.exec"], status: "available" },
  { name: "browser", description: "Navegación con red explícitamente aprobada", inputSchema: { url: "https://…", network: "approval_required" }, riskLevel: "high", permissions: ["network", "browser"], status: "not_implemented" },
  { name: "managed_llm", description: "Proveedor administrado opcional, siempre opt-in", inputSchema: { messages: "array", approvalId: "number" }, riskLevel: "high", permissions: ["external.ai"], status: "disabled_by_default" },
] as const;

function safePath(input: string) {
  const resolved = path.resolve(input);
  if (!SAFE_ROOTS.some(root => resolved === root || resolved.startsWith(`${root}${path.sep}`))) throw new Error("Ruta fuera de los roots permitidos");
  if (blockedNames.has(path.basename(resolved))) throw new Error("Ruta sensible bloqueada");
  return resolved;
}

async function inspectWorkspace(sourcePath: string) {
  const root = safePath(sourcePath);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error("El workspace debe ser una carpeta");
  const entries = await fs.readdir(root, { withFileTypes: true });
  const visible = entries.filter(e => !e.name.startsWith(".") && !blockedNames.has(e.name)).slice(0, 80);
  const structure = visible.map(e => `${e.isDirectory() ? "DIR" : "FILE"}  ${e.name}`).join("\n");
  const packageFiles = ["package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod"].filter(name => entries.some(e => e.name === name));
  let dependencies = packageFiles.join(", ") || "No se detectó manifiesto estándar";
  let entrypoints = ["src/main.tsx", "src/main.ts", "src/index.ts", "main.py", "app.py", "index.html", "server.ts", "index.js"].filter(name => entries.some(e => e.name === name));
  if (packageFiles.includes("package.json")) {
    try { const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")); dependencies = `${Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }).length} paquetes · scripts: ${Object.keys(pkg.scripts ?? {}).join(", ") || "ninguno"}`; entrypoints = Array.from(new Set([...entrypoints, ...(pkg.main ? [pkg.main] : [])])); } catch { dependencies = "package.json no es JSON válido"; }
  }
  const risks: string[] = [];
  if (entries.some(e => e.name === ".env" || e.name === ".env.local")) risks.push("Se detectaron archivos de entorno; no se leen ni se exponen.");
  if (!entries.some(e => e.name === "tests" || e.name === "test" || e.name === "__tests__")) risks.push("No se detectó una carpeta de pruebas convencional.");
  if (!entries.some(e => e.name === "README.md")) risks.push("Falta README.md para documentar operación y límites.");
  const pending = ["terminal", "tests", "browser", "managed_llm"].map(tool => `${tool}: NOT IMPLEMENTED o requiere aprobación explícita`);
  return { root, structure, dependencies, entrypoints: entrypoints.length ? entrypoints.join(", ") : "No identificado", risks, pending, summary: `Workspace inspeccionado con ${visible.length} elementos visibles; red: DESACTIVADA; secretos: protegidos.` };
}

async function ollamaStatus() {
  const endpoint = process.env.AION_OLLAMA_URL || "http://127.0.0.1:11434";
  try { const response = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(1200) }); const data = await response.json() as { models?: Array<{ name: string }> }; return { available: response.ok, endpoint, models: data.models?.map(m => m.name) ?? [], mode: "local" as const }; }
  catch { return { available: false, endpoint, models: [], mode: "local" as const }; }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  aion: router({
    dashboard: publicProcedure.query(async () => ({ projects: await listProjects(), tasks: await listTasks(), executions: await listExecutions(), approvals: await listApprovals(), tools: toolCatalog, model: await ollamaStatus(), network: "OFF", externalProviders: "DISABLED" })),
    projects: publicProcedure.query(() => listProjects()),
    importProject: publicProcedure.input(z.object({ name: z.string().min(1).max(180), sourcePath: z.string().min(1), sourceType: z.enum(["server_path", "git_url"]) })).mutation(async ({ input }) => {
      if (input.sourceType === "git_url") { const approvalId = await insertApproval({ action: `Clonar ${input.sourcePath}`, riskLevel: "high", status: "pending", reason: "La red está desactivada por defecto; requiere aprobación y ejecución posterior." }); await insertExecution({ toolName: "git", riskLevel: "high", status: "blocked", input: input.sourcePath, output: "NOT IMPLEMENTED: clonación remota bloqueada por política de red.", approvalRequired: 1 }); return { status: "needs_approval", approvalId, message: "NOT IMPLEMENTED: la clonación remota requiere aprobación explícita." }; }
      try { const report = await inspectWorkspace(input.sourcePath); const projectId = await insertProject({ name: input.name, sourcePath: report.root, sourceType: "server_path", status: "ready", summary: report.summary, structure: report.structure, dependencies: report.dependencies, entrypoints: report.entrypoints, risks: JSON.stringify(report.risks), pending: JSON.stringify(report.pending) }); if (!projectId) throw new Error("Base de datos no disponible"); for (const risk of report.risks) { const category = risk.includes("pruebas") ? "testing" : risk.includes("entorno") ? "security" : "architecture"; await insertFinding({ projectId, category, severity: category === "security" ? "high" : "medium", title: `${category.toUpperCase()} · hallazgo priorizado`, detail: risk, evidence: report.root, status: "open" }); } await insertFinding({ projectId, category: "dependencies", severity: report.dependencies.includes("no se detectó") ? "medium" : "info", title: "DEPENDENCIES · manifiestos detectados", detail: report.dependencies, evidence: report.root, status: "open" }); await insertFinding({ projectId, category: "bugs", severity: "info", title: "BUGS · análisis estático básico", detail: "La importación no ejecuta código del proyecto; los bugs dinámicos quedan pendientes de tests aprobados.", evidence: report.root, status: "open" }); await saveMemory({ projectId, key: "import_summary", value: report.summary }); await insertExecution({ projectId, toolName: "filesystem", riskLevel: "low", status: "completed", input: report.root, output: report.summary, approvalRequired: 0 }); return { status: "ready", projectId, report }; } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "No se pudo inspeccionar el workspace" }; }
    }),
    importGit: publicProcedure.input(z.object({ name: z.string().min(1).max(180), url: z.string().url().refine(value => value.startsWith("https://"), "Solo se permiten URLs HTTPS"), destination: z.string().min(1), approvalId: z.number().int().positive().optional() })).mutation(async ({ input }) => { if (!input.approvalId) { const approvalId = await insertApproval({ action: `Clonar ${input.url} en ${input.destination}`, riskLevel: "high", status: "pending", reason: "La clonación requiere red temporal y aprobación explícita." }); return { status: "needs_approval", approvalId, message: "Aprobación creada; la red continúa OFF." }; } const approval = await getApproval(input.approvalId); if (approval?.status !== "approved") return { status: "blocked", message: "La aprobación no está resuelta como approved." }; const destination = resolveWorkspacePath(input.destination); const result = await runSafeCommand("git", ["clone", "--", input.url, destination], "/home/ubuntu", { network: true, approved: true, timeoutMs: 60000 }); await insertExecution({ toolName: "git", riskLevel: "high", status: result.status === "completed" ? "completed" : "failed", input: JSON.stringify(input), output: result.stderr || result.stdout, approvalRequired: 0 }); return result; }),
    tasks: publicProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(({ input }) => listTasks(input?.projectId)),
    plan: publicProcedure.input(z.object({ projectId: z.number().int().positive(), instruction: z.string().min(1).optional() })).mutation(async ({ input }) => { const project = await getProject(input.projectId); if (!project) throw new Error("Proyecto no encontrado"); const titles = [input.instruction ? `Objetivo: ${input.instruction}` : "Inspeccionar estructura y manifiestos", "Revisar riesgos de seguridad y secretos", "Verificar dependencias y entrypoints", "Ejecutar pruebas del proyecto (NOT IMPLEMENTED)"]; for (let index = 0; index < titles.length; index++) { const title = titles[index]; await insertTask({ projectId: input.projectId, title, status: index === 3 ? "not_implemented" : "planned", riskLevel: index === 3 ? "high" : "low", dependsOn: index ? String(index) : null, result: index === 3 ? "Requiere ejecutor de procesos aprobado." : "Pendiente de ejecución" }); } await insertExecution({ projectId: input.projectId, toolName: "planner", riskLevel: "low", status: "completed", input: "PLAN", output: "Plan verificable creado con 4 tareas.", approvalRequired: 0 }); return { status: "planned", tasks: await listTasks(input.projectId) }; }),
    routeModel: publicProcedure.input(z.object({ kind: z.enum(["fast", "coding", "reasoning", "vision", "research", "long_context"]), approvalId: z.number().int().positive().optional() })).query(async ({ input }) => { const approval = input.approvalId ? await getApproval(input.approvalId) : undefined; const result = await routeLocalModel(input.kind, { allowManaged: approval?.status === "approved" }); return result.provider?.id === "managed" ? { ...result, costGate: "approved" as const } : { ...result, costGate: "off" as const }; }),
    audit: publicProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ input }) => { const project = await getProject(input.projectId); if (!project) throw new Error("Proyecto no encontrado"); const findings = await listFindings(input.projectId); await insertExecution({ projectId: input.projectId, toolName: "audit", riskLevel: "low", status: "completed", input: project.sourcePath, output: `AUDIT completado: ${findings.length} hallazgos persistidos.`, approvalRequired: 0 }); return { project, findings }; }),
    findings: publicProcedure.input(z.object({ projectId: z.number().int().positive() })).query(({ input }) => listFindings(input.projectId)),
    executions: publicProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(({ input }) => listExecutions(input?.projectId)),
    approvals: publicProcedure.query(() => listApprovals()),
    memory: publicProcedure.input(z.object({ projectId: z.number().int().positive().optional() }).optional()).query(({ input }) => listMemory(input?.projectId)),
    execute: adminProcedure.input(z.object({ projectId: z.number().int().positive().optional(), command: z.string().min(1), args: z.array(z.string()).default([]), cwd: z.string().min(1), approvalId: z.number().int().positive() })).mutation(async ({ input }) => { const approval = await getApproval(input.approvalId); if (approval?.status !== "approved" || !approval.action.includes(input.command)) return { status: "blocked" as const, exitCode: null, stdout: "", stderr: "Aprobación persistida ausente o no vinculada al comando", approvalRequired: true }; const result = await runSafeCommand(input.command, input.args, input.cwd, { approved: true, network: false }); await insertExecution({ projectId: input.projectId, toolName: "terminal", riskLevel: "high", status: result.status === "completed" ? "completed" : result.status === "blocked" ? "blocked" : "failed", input: JSON.stringify({ command: input.command, args: input.args, cwd: input.cwd }), output: result.stderr || result.stdout, approvalRequired: result.approvalRequired ? 1 : 0 }); return result; }),
    modelStatus: publicProcedure.query(() => ollamaStatus()),
    approve: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) })).mutation(async ({ input }) => { await resolveApproval(input.id, input.decision); return { status: input.decision, id: input.id }; }),
  }),
});
export type AppRouter = typeof appRouter;
