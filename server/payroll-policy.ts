export type AgreementRules = {
  version?: string;
  overtimeThresholdHours?: number;
  overtimeMultiplier?: number;
  nightStartHour?: number;
  nightEndHour?: number;
  nightMultiplier?: number;
  holidayWeekdays?: number[];
  holidayMultiplier?: number;
  fixedAllowance?: number;
};

export type ShiftSlice = {
  startTime: Date;
  endTime: Date;
};

export type PayrollBreakdown = {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  baseAmount: number;
  overtimePremium: number;
  nightPremium: number;
  holidayPremium: number;
  fixedAllowance: number;
  totalAmount: number;
  rulesVersion: string;
};

const finitePositive = (value: unknown, fallback: number, maximum: number) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= maximum ? numeric : fallback;
};

const finiteHour = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 23 ? numeric : fallback;
};

export function normalizeAgreementRules(input: unknown): Required<AgreementRules> {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const weekdays = Array.isArray(source.holidayWeekdays)
    ? source.holidayWeekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  return {
    version: typeof source.version === "string" && source.version.trim() ? source.version.trim().slice(0, 40) : "default-1",
    overtimeThresholdHours: finitePositive(source.overtimeThresholdHours, 40, 168),
    overtimeMultiplier: Math.max(1, finitePositive(source.overtimeMultiplier, 1.5, 5)),
    nightStartHour: finiteHour(source.nightStartHour, 22),
    nightEndHour: finiteHour(source.nightEndHour, 6),
    nightMultiplier: Math.max(1, finitePositive(source.nightMultiplier, 1, 5)),
    holidayWeekdays: Array.from(new Set(weekdays)),
    holidayMultiplier: Math.max(1, finitePositive(source.holidayMultiplier, 1, 5)),
    fixedAllowance: finitePositive(source.fixedAllowance, 0, 1_000_000),
  };
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundHours = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function isNightHour(hour: number, start: number, end: number) {
  return start === end ? false : start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

export function calculatePayrollBreakdown(input: {
  hourlyRate: number;
  shifts: ShiftSlice[];
  rules?: unknown;
}): PayrollBreakdown {
  const rate = finitePositive(input.hourlyRate, 0, 1_000_000);
  const rules = normalizeAgreementRules(input.rules);
  let totalHours = 0;
  let nightHours = 0;
  let holidayHours = 0;

  for (const shift of input.shifts) {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const duration = (end.getTime() - start.getTime()) / 3_600_000;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24) continue;
    totalHours += duration;
    const startHour = start.getHours();
    if (isNightHour(startHour, rules.nightStartHour, rules.nightEndHour)) nightHours += duration;
    if (rules.holidayWeekdays.includes(start.getDay())) holidayHours += duration;
  }

  const regularHours = Math.min(totalHours, rules.overtimeThresholdHours);
  const overtimeHours = Math.max(totalHours - rules.overtimeThresholdHours, 0);
  const baseAmount = regularHours * rate;
  const overtimePremium = overtimeHours * rate * (rules.overtimeMultiplier - 1);
  const nightPremium = nightHours * rate * (rules.nightMultiplier - 1);
  const holidayPremium = holidayHours * rate * (rules.holidayMultiplier - 1);
  const totalAmount = baseAmount + overtimePremium + nightPremium + holidayPremium + rules.fixedAllowance;

  return {
    totalHours: roundHours(totalHours),
    regularHours: roundHours(regularHours),
    overtimeHours: roundHours(overtimeHours),
    nightHours: roundHours(nightHours),
    holidayHours: roundHours(holidayHours),
    baseAmount: roundMoney(baseAmount),
    overtimePremium: roundMoney(overtimePremium),
    nightPremium: roundMoney(nightPremium),
    holidayPremium: roundMoney(holidayPremium),
    fixedAllowance: roundMoney(rules.fixedAllowance),
    totalAmount: roundMoney(totalAmount),
    rulesVersion: rules.version,
  };
}
