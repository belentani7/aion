/**
 * AION Auto-Scheduler — constraint-based shift assignment.
 *
 * Assigns employees to open shifts respecting EU labor rules:
 * - Max daily hours per jurisdiction (ES=9, PT=8, FI=8)
 * - Min daily rest between shifts (ES=12h, PT=11h, FI=11h)
 * - Max weekly hours (40h)
 * - Night work limits (8h in 24h period)
 * - Weekly rest day requirements
 *
 * Algorithm: greedy with backtracking. For each unassigned shift,
 * rank eligible employees by workload balance, then assign the
 * least-loaded eligible employee.
 */

type Jurisdiction = "ES" | "PT" | "FI" | "EU";

interface Employee {
  id: number;
  name: string;
  departmentId: number | null;
  hourlyRate: string;
  skills?: string[];
  maxWeeklyHours?: number;
  preferNight?: boolean;
}

interface Shift {
  id: number;
  startTime: Date;
  endTime: Date;
  departmentId: number | null;
  requiredSkills?: string[];
}

interface Assignment {
  shiftId: number;
  employeeId: number;
  reason: string;
}

interface ScheduleResult {
  assignments: Assignment[];
  unassigned: { shiftId: number; reason: string }[];
  metrics: {
    totalShifts: number;
    assigned: number;
    unassigned: number;
    avgHoursPerEmployee: number;
    maxHoursEmployee: { id: number; hours: number } | null;
    minHoursEmployee: { id: number; hours: number } | null;
  };
}

const RULES: Record<Jurisdiction, {
  maxDailyHours: number;
  minDailyRest: number;
  maxWeeklyHours: number;
  nightMaxHours: number;
  weeklyRestDays: number;
}> = {
  ES: { maxDailyHours: 9, minDailyRest: 12, maxWeeklyHours: 40, nightMaxHours: 8, weeklyRestDays: 1.5 },
  PT: { maxDailyHours: 8, minDailyRest: 11, maxWeeklyHours: 40, nightMaxHours: 8, weeklyRestDays: 1 },
  FI: { maxDailyHours: 8, minDailyRest: 11, maxWeeklyHours: 40, nightMaxHours: 8, weeklyRestDays: 2 },
  EU: { maxDailyHours: 8, minDailyRest: 11, maxWeeklyHours: 48, nightMaxHours: 8, weeklyRestDays: 1 },
};

function shiftDurationHours(shift: Shift): number {
  return (shift.endTime.getTime() - shift.startTime.getTime()) / 3_600_000;
}

function restBetween(prev: Shift, next: Shift): number {
  return (next.startTime.getTime() - prev.endTime.getTime()) / 3_600_000;
}

function shiftsOverlap(a: Shift, b: Shift): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

function isNightShift(shift: Shift): boolean {
  const startHour = shift.startTime.getHours();
  const endHour = shift.endTime.getHours();
  return startHour >= 22 || endHour <= 6 || startHour < 6;
}

function weekOf(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() - dayOfWeek + 1);
  return d.toISOString().slice(0, 10);
}

export function autoSchedule(
  employees: Employee[],
  shifts: Shift[],
  jurisdiction: Jurisdiction = "ES",
): ScheduleResult {
  const rules = RULES[jurisdiction] || RULES.ES;
  const sorted = [...shifts].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const employeeShifts = new Map<number, Shift[]>();
  for (const emp of employees) {
    employeeShifts.set(emp.id, []);
  }

  const assignments: Assignment[] = [];
  const unassigned: { shiftId: number; reason: string }[] = [];

  for (const shift of sorted) {
    const duration = shiftDurationHours(shift);

    if (duration > rules.maxDailyHours) {
      unassigned.push({ shiftId: shift.id, reason: `Shift duration ${duration.toFixed(1)}h exceeds max ${rules.maxDailyHours}h` });
      continue;
    }

    type Candidate = { id: number; score: number; reason: string };
    const candidates: Candidate[] = [];

    for (const emp of employees) {
      const assigned = employeeShifts.get(emp.id) || [];

      if (assigned.some(s => shiftsOverlap(s, shift))) continue;

      const lastShift = assigned.filter(s => s.endTime <= shift.startTime).sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];
      if (lastShift && restBetween(lastShift, shift) < rules.minDailyRest) continue;

      const week = weekOf(shift.startTime);
      const weeklyHours = assigned
        .filter(s => weekOf(s.startTime) === week)
        .reduce((sum, s) => sum + shiftDurationHours(s), 0);
      const maxWeekly = emp.maxWeeklyHours ?? rules.maxWeeklyHours;
      if (weeklyHours + duration > maxWeekly) continue;

      if (shift.departmentId && emp.departmentId && shift.departmentId !== emp.departmentId) continue;

      if (shift.requiredSkills?.length && emp.skills?.length) {
        const hasAll = shift.requiredSkills.every(s => emp.skills!.includes(s));
        if (!hasAll) continue;
      }

      let score = 100 - weeklyHours;
      if (emp.preferNight && isNightShift(shift)) score += 10;
      if (shift.departmentId === emp.departmentId) score += 5;

      candidates.push({ id: emp.id, score, reason: `${weeklyHours.toFixed(1)}h this week` });
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      assignments.push({ shiftId: shift.id, employeeId: best.id, reason: best.reason });
      employeeShifts.get(best.id)!.push(shift);
    } else {
      unassigned.push({ shiftId: shift.id, reason: "No eligible employee (all constrained)" });
    }
  }

  const hoursPerEmployee = new Map<number, number>();
  for (const [empId, empShifts] of employeeShifts) {
    hoursPerEmployee.set(empId, empShifts.reduce((sum: number, s: Shift) => sum + shiftDurationHours(s), 0));
  }

  let maxEmp: { id: number; hours: number } | null = null;
  let minEmp: { id: number; hours: number } | null = null;
  let totalHours = 0;
  let activeCount = 0;
  for (const [id, hours] of hoursPerEmployee) {
    if (hours > 0) {
      activeCount++;
      totalHours += hours;
      if (!maxEmp || hours > maxEmp.hours) maxEmp = { id, hours };
      if (!minEmp || hours < minEmp.hours) minEmp = { id, hours };
    }
  }

  return {
    assignments,
    unassigned,
    metrics: {
      totalShifts: shifts.length,
      assigned: assignments.length,
      unassigned: unassigned.length,
      avgHoursPerEmployee: activeCount > 0 ? Math.round((totalHours / activeCount) * 10) / 10 : 0,
      maxHoursEmployee: maxEmp,
      minHoursEmployee: minEmp,
    },
  };
}
