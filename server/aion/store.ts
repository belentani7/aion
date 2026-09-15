export type AionProjectRecord = {
  id: number;
  name: string;
  sourcePath: string;
  sourceType: string;
  status: string;
  createdAt: Date;
};

export type AionTaskRecord = {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: string;
  position: number;
};

export type AionExecutionRecord = {
  id: number;
  projectId: number;
  command: string;
  status: string;
  output: string;
  createdAt: Date;
};

export type AionMemoryRecord = {
  id: number;
  projectId: number;
  memoryKey: string;
  value: string;
  createdAt: Date;
};

export type AionMemoryStore = {
  projects: AionProjectRecord[];
  tasks: AionTaskRecord[];
  executions: AionExecutionRecord[];
  memory: AionMemoryRecord[];
};

/**
 * In-memory fallback used when `DATABASE_URL` is not configured (e.g. tests and
 * local development). Keeps the AION data layer functional without a running
 * MySQL server.
 */
export const aionMemoryStore: AionMemoryStore = {
  projects: [],
  tasks: [],
  executions: [],
  memory: [],
};

let sequence = 1;

export function nextAionId(): number {
  return sequence++;
}

export function clearProjectFromMemory(projectId: number): void {
  aionMemoryStore.projects = aionMemoryStore.projects.filter(project => project.id !== projectId);
  aionMemoryStore.tasks = aionMemoryStore.tasks.filter(task => task.projectId !== projectId);
  aionMemoryStore.executions = aionMemoryStore.executions.filter(
    execution => execution.projectId !== projectId
  );
  aionMemoryStore.memory = aionMemoryStore.memory.filter(record => record.projectId !== projectId);
}
