import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const SAFE_ROOTS = ["/home/ubuntu", "/tmp/aion-workspaces"];
const COMMANDS = new Set(["pnpm", "npm", "yarn", "node", "python3", "pytest", "git"]);
const SECRET = /(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*([^\s,;]+)/gi;

export function resolveWorkspacePath(input: string) {
  const resolved = path.resolve(input);
  if (!SAFE_ROOTS.some(root => resolved === root || resolved.startsWith(`${root}${path.sep}`))) throw new Error("Ruta fuera del workspace permitido");
  if (resolved.split(path.sep).some(part => [".env", ".env.local", ".ssh"].includes(part))) throw new Error("Ruta sensible bloqueada");
  return resolved;
}

export function redactSecrets(value: string) { return value.replace(SECRET, "$1=[REDACTED]"); }

export async function runSafeCommand(command: string, args: string[], cwd: string, options?: { network?: boolean; approved?: boolean; timeoutMs?: number }) {
  const workspace = resolveWorkspacePath(cwd);
  const executable = path.basename(command);
  if (!COMMANDS.has(executable)) return { status: "blocked" as const, exitCode: null, stdout: "", stderr: "Comando no permitido por allowlist", approvalRequired: false };
  if (options?.network && !options?.approved) return { status: "blocked" as const, exitCode: null, stdout: "", stderr: "La red está desactivada por defecto", approvalRequired: true };
  if (!options?.approved && ["git", "pnpm", "npm", "yarn", "node", "python3", "pytest"].includes(executable)) return { status: "blocked" as const, exitCode: null, stdout: "", stderr: "Aprobación requerida antes de ejecutar procesos", approvalRequired: true };
  try { const result = await execFileAsync(command, args, { cwd: workspace, timeout: options?.timeoutMs ?? 10000, maxBuffer: 300_000, env: { ...process.env, AION_NETWORK: "OFF" } }); return { status: "completed" as const, exitCode: 0, stdout: redactSecrets(result.stdout), stderr: redactSecrets(result.stderr), approvalRequired: false }; }
  catch (error: any) { return { status: "failed" as const, exitCode: typeof error?.code === "number" ? error.code : 1, stdout: redactSecrets(error?.stdout ?? ""), stderr: redactSecrets(error?.stderr ?? error?.message ?? "Error de ejecución"), approvalRequired: false }; }
}

export async function readSafeFile(filePath: string) { return fs.readFile(resolveWorkspacePath(filePath), "utf8"); }
