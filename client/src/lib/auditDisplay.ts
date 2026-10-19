const sensitiveAuditKey = /^(name|tenantName|employeeName|email|phone|address|ssn|taxId)$/i;

export function redactAuditPayload(value: unknown, redactedLabel: string, key?: string): unknown {
  if (key && sensitiveAuditKey.test(key)) return redactedLabel;
  if (Array.isArray(value)) return value.map((item) => redactAuditPayload(item, redactedLabel));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, redactAuditPayload(childValue, redactedLabel, childKey)]),
    );
  }
  return value;
}
