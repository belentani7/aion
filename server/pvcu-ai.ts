import { randomUUID } from "node:crypto";
import { canonicalize, sha256, type MemberRole, type ValidationResult } from "./pvcu";

export interface AiValidationEvidence {
  validationId: string;
  subspheres: Array<"4-A" | "2-A" | "8" | "7-agent">;
  result: ValidationResult;
  findings: string[];
  inputHash: string;
  outputHash: string;
  modelId?: string;
  modelVersion?: string;
  policyVersion: string;
  timestamp: string;
  redaction: "content-not-stored";
}

export interface ValidationEnvelope {
  specversion: "1.0";
  type: "com.aion.pvcu.validation.v1";
  id: string;
  source: string;
  time: string;
  subject: string;
  datacontenttype: "application/json";
  data: AiValidationEvidence;
}

const PROMPT_INJECTION = /ignore\s+(all\s+)?previous|system\s+prompt|reveal\s+(the\s+)?(secret|system)|jailbreak|developer\s+message/i;
const SECRET_OR_PII = /(sk-[a-z0-9]{16,}|api[_ -]?key\s*[:=]|password\s*[:=]|\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b)/i;

function baseEvidence(input: { subspheres: AiValidationEvidence["subspheres"]; result: ValidationResult; findings: string[]; prompt: unknown; response: unknown; modelId?: string; modelVersion?: string; now?: Date }): AiValidationEvidence {
  return {
    validationId: randomUUID(),
    subspheres: input.subspheres,
    result: input.result,
    findings: input.findings,
    inputHash: sha256(input.prompt),
    outputHash: sha256(input.response),
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    policyVersion: "pvcu.ai/1.0.0",
    timestamp: (input.now ?? new Date()).toISOString(),
    redaction: "content-not-stored",
  };
}

export function validateModelInteraction(input: {
  prompt: string;
  response: unknown;
  modelId?: string;
  modelVersion?: string;
  expectedJson?: boolean;
  maxPromptChars?: number;
  maxResponseChars?: number;
}): AiValidationEvidence {
  const findings: string[] = [];
  if (input.prompt.length > (input.maxPromptChars ?? 16_000)) findings.push("PVC-4A-001 prompt exceeds length budget");
  const responseText = typeof input.response === "string" ? input.response : canonicalize(input.response);
  if (responseText.length > (input.maxResponseChars ?? 32_000)) findings.push("PVC-4A-002 response exceeds length budget");
  if (PROMPT_INJECTION.test(input.prompt)) findings.push("PVC-4A-003 prompt injection pattern detected");
  if (SECRET_OR_PII.test(responseText)) findings.push("PVC-4A-004 possible secret or personal data in model response");
  if (input.expectedJson && typeof input.response === "string") {
    try { JSON.parse(input.response); } catch { findings.push("PVC-4A-005 response is not valid JSON"); }
  }
  return baseEvidence({ subspheres: ["4-A", "2-A"], result: findings.length ? "quarantine" : "allowed", findings, prompt: input.prompt, response: input.response, modelId: input.modelId, modelVersion: input.modelVersion });
}

export function validateModelLifecycle(input: {
  prompt?: unknown;
  modelId: string;
  modelVersion: string;
  approvedModelVersion: string;
  baselineMetric: number;
  productionMetric: number;
  driftThreshold?: number;
}): AiValidationEvidence {
  const findings: string[] = [];
  if (input.modelVersion !== input.approvedModelVersion) findings.push("PVC-8-001 model version is not approved");
  const delta = Math.abs(input.baselineMetric - input.productionMetric);
  if (delta > (input.driftThreshold ?? 0.1)) findings.push("PVC-8-002 production metric drift exceeds threshold");
  return baseEvidence({ subspheres: ["8"], result: findings.length ? "human_review" : "allowed", findings, prompt: input.prompt ?? { modelId: input.modelId }, response: { modelVersion: input.modelVersion, productionMetric: input.productionMetric }, modelId: input.modelId, modelVersion: input.modelVersion });
}

export function validateAgentAction(input: {
  intent: string;
  action: string;
  role: MemberRole;
  allowedActions: string[];
  estimatedCost: number;
  budget: number;
  reversible: boolean;
  requiresHumanApproval?: boolean;
}): AiValidationEvidence {
  const findings: string[] = [];
  if (!input.allowedActions.includes(input.action)) findings.push("PVC-7AG-001 action is outside the declared tool allowlist");
  if (input.estimatedCost < 0 || input.estimatedCost > input.budget) findings.push("PVC-7AG-002 action exceeds its budget");
  if (!input.reversible && input.role !== "owner") findings.push("PVC-7AG-003 irreversible action requires owner role");
  if (input.requiresHumanApproval) findings.push("PVC-7AG-004 human approval is required before execution");
  return baseEvidence({ subspheres: ["7-agent"], result: findings.length ? "human_review" : "allowed", findings, prompt: { intent: input.intent, role: input.role }, response: { action: input.action, reversible: input.reversible }, modelId: "agent-policy", modelVersion: "1.0.0" });
}

export function createValidationEnvelope(evidence: AiValidationEvidence, subject: string, source = "aion-workforce/pvcu"): ValidationEnvelope {
  return {
    specversion: "1.0",
    type: "com.aion.pvcu.validation.v1",
    id: evidence.validationId,
    source,
    time: evidence.timestamp,
    subject,
    datacontenttype: "application/json",
    data: evidence,
  };
}
