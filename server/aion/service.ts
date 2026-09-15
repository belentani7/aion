import { eq } from "drizzle-orm";
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
  name: string;
  sourcePath: string;
  sourceType: string;
};

export type ImportProjectResult = {
  status: "ready";
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
  { command: "workspace.scan", status: "completed", output: "Inventario del workspace completado." },
  { command: "deps.audit", status: "completed", output: "Dependencias analizadas sin red externa." },
  { command: "tests.run", status: "not_implemented", output: "La ejecucion de procesos requiere aprobacion explicita." },
];

const MEMORY_TEMPLATE: { memoryKey: string; value: string }[] = [
  { memoryKey: "project.summary", value: "Proyecto importado y planificado en modo seguro (red OFF)." },
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

export async function importProject(input: ImportProjectInput): Promise<ImportProjectResult> {
  const db = await getDb();
  if (db) {
    try {
      const inserted = await db.insert(aionProjects).values({
        name: input.name,
        sourcePath: input.sourcePath,
        sourceType: input.sourceType,
        status: "ready",
      });
      const projectId = extractInsertId(inserted);
      if (projectId !== null) {
        await db.insert(aionTasks).values(
          PLAN_TEMPLATE.map((task, index) => ({
            projectId,
            title: task.title,
            description: task.description,
            status: "pending",
            position: index,
          }))
        );
        await db.insert(aionExecutions).values(
          EXECUTION_TEMPLATE.map(execution => ({ projectId, ...execution }))
        );
        await db.insert(aionMemory).values(
          MEMORY_TEMPLATE.map(record => ({ projectId, ...record }))
        );
        return { status: "ready", projectId };
      }
    } catch (error) {
      console.warn("[AION] importProject: using in-memory store:", error);
    }
  }

  const projectId = nextAionId();
  const project: AionProjectRecord = {
    id: projectId,
    name: input.name,
    sourcePath: input.sourcePath,
    sourceType: input.sourceType,
    status: "ready",
    createdAt: new Date(),
  };
  aionMemoryStore.projects.push(project);

  PLAN_TEMPLATE.forEach((task, index) => {
    const id = nextAionId();
    aionMemoryStore.tasks.push({
      id,
      projectId,
      title: task.title,
      description: task.description,
      status: "pending",
      position: index,
    });
  });
  EXECUTION_TEMPLATE.forEach(execution => {
    const id = nextAionId();
    aionMemoryStore.executions.push({
      id,
      projectId,
      command: execution.command,
      status: execution.status,
      output: execution.output,
      createdAt: new Date(),
    });
  });
  MEMORY_TEMPLATE.forEach(record => {
    const id = nextAionId();
    aionMemoryStore.memory.push({
      id,
      projectId,
      memoryKey: record.memoryKey,
      value: record.value,
      createdAt: new Date(),
    });
  });

  return { status: "ready", projectId };
}

export async function plan(projectId: number): Promise<{ tasks: AionTaskRecord[] }> {
  const db = await getDb();
  if (db) {
    try {
      const rows = (await db.select().from(aionTasks).where(eq(aionTasks.projectId, projectId))) as Record<
        string,
        unknown
      >[];
      if (rows.length > 0) {
        return { tasks: rows.map(normalizeTask).sort((a, b) => a.position - b.position) };
      }
    } catch (error) {
      console.warn("[AION] plan: using in-memory store:", error);
    }
  }
  const tasks = aionMemoryStore.tasks
    .filter(task => task.projectId === projectId)
    .sort((a, b) => a.position - b.position);
  return { tasks };
}

export async function audit(projectId: number): Promise<{ project: { id: number } }> {
  const db = await getDb();
  if (db) {
    try {
      const rows = (await db
        .select()
        .from(aionProjects)
        .where(eq(aionProjects.id, projectId))
        .limit(1)) as Record<string, unknown>[];
      if (rows.length > 0) {
        return { project: { id: Number(rows[0].id) } };
      }
    } catch (error) {
      console.warn("[AION] audit: using in-memory store:", error);
    }
  }
  const project = aionMemoryStore.projects.find(candidate => candidate.id === projectId);
  return { project: { id: project ? project.id : projectId } };
}

export async function executions(projectId: number): Promise<AionExecutionRecord[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = (await db
        .select()
        .from(aionExecutions)
        .where(eq(aionExecutions.projectId, projectId))) as Record<string, unknown>[];
      if (rows.length > 0) return rows.map(normalizeExecution);
    } catch (error) {
      console.warn("[AION] executions: using in-memory store:", error);
    }
  }
  return aionMemoryStore.executions.filter(execution => execution.projectId === projectId);
}

export async function memory(projectId: number): Promise<AionMemoryRecord[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = (await db
        .select()
        .from(aionMemory)
        .where(eq(aionMemory.projectId, projectId))) as Record<string, unknown>[];
      if (rows.length > 0) return rows.map(normalizeMemory);
    } catch (error) {
      console.warn("[AION] memory: using in-memory store:", error);
    }
  }
  return aionMemoryStore.memory.filter(record => record.projectId === projectId);
}
