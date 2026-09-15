import os from "os";
import path from "path";

export const REDACTED = "[REDACTED]";

const SECRET_KEY_PATTERN =
  /(api[_-]?key|access[_-]?key|private[_-]?key|secret|token|password|passwd|pwd|credential|authorization|bearer)(\s*[:=]\s*)(["']?)([^\s"',;]+)\3/gi;

const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._\-]+/gi;

export function redactSecrets(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  return text
    .replace(SECRET_KEY_PATTERN, (_match, key: string, separator: string, quote: string) => {
      return `${key}${separator}${quote}${REDACTED}${quote}`;
    })
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`);
}

function permittedRoots(): string[] {
  const roots: string[] = [];
  const envRoot = process.env.AION_WORKSPACE_ROOT;
  if (envRoot && envRoot.trim().length > 0) roots.push(path.resolve(envRoot));
  roots.push(path.resolve(path.join(os.tmpdir(), "aion-workspaces")));
  roots.push(path.resolve("/home/ubuntu/aion"));
  return roots;
}

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveWorkspacePath(candidate: string): string {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new Error("Ruta fuera de los directorios permitidos: valor vacio");
  }
  const resolved = path.resolve(candidate);
  const roots = permittedRoots();
  const allowed = roots.some(root => isInsideRoot(root, resolved));
  if (!allowed) {
    throw new Error(`Ruta fuera de los directorios permitidos: ${candidate}`);
  }
  return resolved;
}

export type SafeCommandResult = {
  status: string;
  approvalRequired: boolean;
};

export async function runSafeCommand(
  cmd: string,
  args: string[],
  cwd: string
): Promise<SafeCommandResult> {
  void cmd;
  void args;
  void cwd;
  if (process.env.AION_AGENT_APPROVED !== "YES") {
    return { status: "blocked", approvalRequired: true };
  }
  return { status: "not_implemented", approvalRequired: false };
}
