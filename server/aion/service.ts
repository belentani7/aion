import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
  aionExecutions,
  aionMemory,
  aionProjects,
  aionTasks,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  aionMemoryStore,
  nextAionId,
  type AionExecutionRecord,
  type AionMemoryRecord,
  type AionProjectRecord,
  type AionTaskRecord,
} from "./store";

export type ImportProjectInput = {
  ownerId: number;
  name: string;
  sourcePath: string;
  sourceType: string;
};

export type ImportProjectResult = {
  status: "ready";
  scope: "registration-only";
  projectId: number;
};

const PLAN_TEMPLATE: { title: string; description: string }[] = [
  { title: "Inventariar el workspace", description: "Listar archivos y limites del proyecto importado." },
  { title: "Detectar stack y dependencias", description: "Identificar lenguajes, frameworks y manifiestos." },
  { title: "Ejecutar auditoria estatica", description: "Buscar secretos, rutas inseguras y comandos sin aprobar." },
  { title: "Generar plan de remediacion", description: "Priorizar hallazgos y proponer cambios concretos." },
  { title: "Verificar hallazgos", description: "Confirmar que cada hallazgo se reproduce de forma determinista." },
];

const EXECUTION_TEMPLATE: { command: string; status: string; output: string }[] = [
  { command: "workspace.scan", status: "pending", output: "Inventario pendiente; registrar una ruta no ejecuta un escaneo." },
  { command: "deps.audit", status: "pending", output: "Analisis de dependencias pendiente; no se ha ejecutado." },
  { command: "tests.run", status: "not_implemented", output: "La ejecucion de procesos requiere aprobacion explicita." },
];

const MEMORY_TEMPLATE: { memoryKey: string; value: string }[] = [
  { memoryKey: "project.summary", value: "Registro y plan inicial creados. No se han ejecutado auditorias ni procesos." },
];

function extractInsertId(result: unknown): number | null {
  if (!result) return null;
  const header = (Array.isArray(result) ? result[0] : result) as
    | { insertId?: number | string; insert_id?: number | string }
    | undefined;
  const raw = header?.insertId ?? header?.insert_id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeTask(row: Record<string, unknown>): AionTaskRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.projectId),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: String(row.status ?? "pending"),
    position: Number(row.position ?? 0),
  };
}

function normalizeExecution(row: Record<string, unknown>): AionExecutionRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.projectId),
    command: String(row.command ?? ""),
    status: String(row.status ?? ""),
    output: String(row.output ?? ""),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
  };
}

function normalizeMemory(row: Record<string, unknown>): AionMemoryRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.projectId),
    memoryKey: String(row.memoryKey ?? ""),
    value: String(row.value ?? ""),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
  };
}


function dataUnavailable(): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project data unavailable; verify database configuration and migrations" });
}
async function backend() {
  const db = await getDb();
  if (!db && (process.env.DATABASE_URL || (process.env.NODE_ENV === "production" && process.env.AION_EPHEMERAL_DEMO !== "1"))) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Persistent database required; ephemeral demo must be explicitly enabled" });
  }
  return db;
}
async function ownedProject(projectId: number, ownerId: number) {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new TRPCError({ code: "UNAUTHORIZED" });
  const db = await backend();
  let found = false;
  if (db) {
    try {
      const rows = await db.select({id:aionProjects.id}).from(aionProjects)
        .where(and(eq(aionProjects.id, projectId), eq(aionProjects.ownerId, ownerId))).limit(1);
      found = rows.length === 1;
    } catch { dataUnavailable(); }
  } else {
    found = aionMemoryStore.projects.some(p => p.id === projectId && p.ownerId === ownerId);
  }
  // Do not disclose whether an inaccessible project exists.
  if (!found) throw new TRPCError({code:"NOT_FOUND", message:"Project not found"});
  return db;
}
export async function importProject(input: ImportProjectInput): Promise<ImportProjectResult> {
  if (!Number.isSafeInteger(input.ownerId) || input.ownerId <= 0) throw new TRPCError({code:"UNAUTHORIZED"});
  const db = await backend();
  if (db) {
    try {
      const projectId = await db.transaction(async (tx: any) => {
        const result = await tx.insert(aionProjects).values({...input, status:"ready"});
        const id = extractInsertId(result);
        if (id === null) throw new Error("Missing project identifier");
        await tx.insert(aionTasks).values(PLAN_TEMPLATE.map((task, position)=>({projectId:id,...task,status:"pending",position})));
        await tx.insert(aionExecutions).values(EXECUTION_TEMPLATE.map(row=>({projectId:id,...row})));
        await tx.insert(aionMemory).values(MEMORY_TEMPLATE.map(row=>({projectId:id,...row})));
        return id;
      });
      return {status:"ready",scope:"registration-only",projectId};
    } catch { dataUnavailable(); }
  }
  const projectId = nextAionId();
  aionMemoryStore.projects.push({id:projectId,...input,status:"ready",createdAt:new Date()});
  PLAN_TEMPLATE.forEach((task,position)=>aionMemoryStore.tasks.push({id:nextAionId(),projectId,...task,status:"pending",position}));
  EXECUTION_TEMPLATE.forEach(row=>aionMemoryStore.executions.push({id:nextAionId(),projectId,...row,createdAt:new Date()}));
  MEMORY_TEMPLATE.forEach(row=>aionMemoryStore.memory.push({id:nextAionId(),projectId,...row,createdAt:new Date()}));
  return {status:"ready",scope:"registration-only",projectId};
}
export async function plan(projectId: number, ownerId: number): Promise<{tasks:AionTaskRecord[]}> {
  const db = await ownedProject(projectId, ownerId);
  if (db) {
    try {
      const rows = await db.select().from(aionTasks).where(eq(aionTasks.projectId,projectId));
      return {tasks:rows.map(normalizeTask).sort((a:AionTaskRecord,b:AionTaskRecord)=>a.position-b.position)};
    } catch { dataUnavailable(); }
  }
  return {tasks:aionMemoryStore.tasks.filter(t=>t.projectId===projectId).sort((a,b)=>a.position-b.position)};
}
export async function audit(projectId: number, ownerId: number) {
  await ownedProject(projectId, ownerId);
  return {project:{id:projectId},status:"not_performed" as const};
}
export async function executions(projectId: number, ownerId: number): Promise<AionExecutionRecord[]> {
  const db = await ownedProject(projectId, ownerId);
  if (db) {
    try {return (await db.select().from(aionExecutions).where(eq(aionExecutions.projectId,projectId))).map(normalizeExecution);}
    catch {dataUnavailable();}
  }
  return aionMemoryStore.executions.filter(row=>row.projectId===projectId);
}
export async function memory(projectId: number, ownerId: number): Promise<AionMemoryRecord[]> {
  const db = await ownedProject(projectId, ownerId);
  if (db) {
    try {return (await db.select().from(aionMemory).where(eq(aionMemory.projectId,projectId))).map(normalizeMemory);}
    catch {dataUnavailable();}
  }
  return aionMemoryStore.memory.filter(row=>row.projectId===projectId);
}
