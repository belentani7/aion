import { createHash, randomUUID } from "node:crypto";

export type RiskClass = "low" | "medium" | "high" | "critical";
export type ValidationResult = "allowed" | "denied" | "quarantine" | "human_review";
export type FailureMode = "fail_closed" | "fail_degraded" | "quarantine" | "human_review" | "fail_open_supervised";
export type ValidationLayer = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8";
export type MemberRole = "owner" | "admin" | "manager" | "employee" | "anonymous";

export interface ValidationProfile {
  profileId: string;
  version: string;
  description: string;
  riskClass: RiskClass;
  layers: ValidationLayer[];
  failureMode: FailureMode;
  signatureRequired: boolean;
  hashChain: boolean;
  retentionDays: number;
  status: "draft" | "active" | "deprecated" | "archived";
}

export interface PvcuInput {
  operation: string;
  tenantId?: number;
  userId?: number;
  role?: MemberRole;
  payload?: unknown;
  profile?: ValidationProfile;
  correlationId?: string;
  previousEvidenceHash?: string | null;
  idempotencyKey?: string;
  now?: Date;
}

export interface ValidationEvidence {
  validationId: string;
  correlationId: string;
  operation: string;
  riskClass: RiskClass;
  profileId: string;
  profileVersion: string;
  layers: ValidationLayer[];
  result: ValidationResult;
  failureMode: FailureMode;
  policyVersion: string;
  validator: "pvcu-engine";
  timestamp: string;
  tenantId: number | null;
  userId: number | null;
  inputHash: string;
  previousEvidenceHash: string | null;
  evidenceHash: string;
  findings: string[];
  redaction: "payload-hash-only";
}

const roleRank: Record<MemberRole, number> = {
  anonymous: 0,
  employee: 10,
  manager: 20,
  admin: 30,
  owner: 40,
};

const operationRisk: Array<[RegExp, RiskClass]> = [
  [/stripe|payment|checkout|billing|subscription/i, "critical"],
  [/ledger|audit\.write|role|plan|payroll|salary|delete|export/i, "high"],
  [/shift\.create|shift\.update|incident|employee\.create|department/i, "medium"],
];

const operationMinimumRole: Array<[RegExp, MemberRole]> = [
  [/stripe|payment|checkout|billing|subscription|plan/i, "admin"],
  [/ledger|audit\.write|payroll|salary|employee\.delete|role/i, "manager"],
  [/shift\.(create|update|delete)|incident|department/i, "manager"],
  [/employee\.(create|update)/i, "manager"],
];

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

export function classifyRisk(operation: string, payload?: unknown): RiskClass {
  for (const [pattern, risk] of operationRisk) if (pattern.test(operation)) return risk;
  if (payload && typeof payload === "object" && "externalEffect" in payload) return "high";
  return "low";
}

export function defaultProfile(riskClass: RiskClass): ValidationProfile {
  const layers: Record<RiskClass, ValidationLayer[]> = {
    low: ["L0", "L1", "L2", "L3", "L8"],
    medium: ["L0", "L1", "L2", "L3", "L4", "L5", "L8"],
    high: ["L0", "L1", "L2", "L3", "L4", "L5", "L8"],
    critical: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"],
  };
  const failureMode: Record<RiskClass, FailureMode> = {
    low: "fail_degraded",
    medium: "fail_closed",
    high: "human_review",
    critical: "fail_closed",
  };
  return {
    profileId: `pvcu.aion.${riskClass}`,
    version: "1.0.0",
    description: `AION Workforce ${riskClass} risk validation profile`,
    riskClass,
    layers: layers[riskClass],
    failureMode: failureMode[riskClass],
    signatureRequired: riskClass === "critical",
    hashChain: true,
    retentionDays: riskClass === "critical" ? 2555 : 730,
    status: "active",
  };
}

function minimumRoleFor(operation: string): MemberRole | null {
  for (const [pattern, role] of operationMinimumRole) if (pattern.test(operation)) return role;
  return null;
}

function structuralFindings(payload: unknown): string[] {
  const findings: string[] = [];
  if (payload === undefined) return findings;
  if (typeof payload === "function" || typeof payload === "symbol") findings.push("payload contains unsupported executable value");
  if (typeof payload === "string" && payload.length > 100_000) findings.push("payload exceeds structural size budget");
  return findings;
}

function semanticFindings(operation: string, payload: unknown): string[] {
  const findings: string[] = [];
  if (!payload || typeof payload !== "object") return findings;
  const record = payload as Record<string, unknown>;
  if (record.startTime && record.endTime) {
    const start = new Date(String(record.startTime)).getTime();
    const end = new Date(String(record.endTime)).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) findings.push("endTime must be after startTime");
  }
  for (const field of ["hourlyRate", "totalAmount", "amount", "hoursWorked"]) {
    if (field in record && Number(record[field]) < 0) findings.push(`${field} cannot be negative`);
  }
  if (/export/i.test(operation) && record.limit !== undefined && Number(record.limit) > 10_000) findings.push("export limit exceeds safety budget");
  return findings;
}

function securityFindings(input: PvcuInput, profile: ValidationProfile): string[] {
  const findings: string[] = [];
  if (!input.tenantId || !Number.isInteger(input.tenantId) || input.tenantId <= 0) findings.push("tenant context is required");
  if (!input.userId || !Number.isInteger(input.userId) || input.userId <= 0) findings.push("authenticated user context is required");
  const minimumRole = minimumRoleFor(input.operation);
  if (minimumRole && roleRank[input.role ?? "anonymous"] < roleRank[minimumRole]) findings.push(`operation requires role ${minimumRole}`);
  if (profile.signatureRequired && !input.idempotencyKey) findings.push("critical operation requires idempotencyKey");
  return findings;
}

export function validatePvcu(input: PvcuInput): ValidationEvidence {
  const timestamp = (input.now ?? new Date()).toISOString();
  const riskClass = input.profile?.riskClass ?? classifyRisk(input.operation, input.payload);
  const profile = input.profile ?? defaultProfile(riskClass);
  const findings = [
    ...structuralFindings(input.payload),
    ...semanticFindings(input.operation, input.payload),
    ...securityFindings(input, profile),
  ];
  const result: ValidationResult = findings.length === 0 ? "allowed" : profile.failureMode === "quarantine" ? "quarantine" : profile.failureMode === "human_review" ? "human_review" : "denied";
  const validationId = randomUUID();
  const correlationId = input.correlationId ?? validationId;
  const inputHash = sha256({ operation: input.operation, tenantId: input.tenantId ?? null, userId: input.userId ?? null, payload: input.payload ?? null });
  const unsigned = {
    validationId,
    correlationId,
    operation: input.operation,
    riskClass,
    profileId: profile.profileId,
    profileVersion: profile.version,
    layers: profile.layers,
    result,
    failureMode: profile.failureMode,
    policyVersion: `${profile.profileId}@${profile.version}`,
    timestamp,
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    inputHash,
    previousEvidenceHash: input.previousEvidenceHash ?? null,
    findings,
  };
  return {
    ...unsigned,
    validator: "pvcu-engine",
    redaction: "payload-hash-only",
    evidenceHash: sha256(unsigned),
  };
}

export function assertPvcuAllowed(input: PvcuInput): ValidationEvidence {
  const evidence = validatePvcu(input);
  if (evidence.result !== "allowed") {
    const error = new Error(`PVC-U validation ${evidence.result}: ${evidence.findings.join("; ")}`);
    Object.assign(error, { code: "PVCU_VALIDATION_FAILED", evidence });
    throw error;
  }
  return evidence;
}

export function verifyEvidenceChain(events: Array<Pick<ValidationEvidence, "evidenceHash" | "previousEvidenceHash">>): boolean {
  return events.every((event, index) => event.previousEvidenceHash === (index === 0 ? null : events[index - 1]?.evidenceHash));
}
