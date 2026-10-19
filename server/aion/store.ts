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

/** Remove one project's in-memory data without replacing shared array references. */
export function clearProjectFromMemory(projectId: number): void {
  const keepInPlace = <T>(rows: T[], shouldKeep: (row: T) => boolean) => {
    let writeIndex = 0;
    for (const row of rows) {
      if (shouldKeep(row)) rows[writeIndex++] = row;
    }
    rows.length = writeIndex;
  };

  keepInPlace(aionMemoryStore.projects, (project) => project.id !== projectId);
  keepInPlace(aionMemoryStore.tasks, (task) => task.projectId !== projectId);
  keepInPlace(aionMemoryStore.executions, (execution) => execution.projectId !== projectId);
  keepInPlace(aionMemoryStore.memory, (record) => record.projectId !== projectId);
}
