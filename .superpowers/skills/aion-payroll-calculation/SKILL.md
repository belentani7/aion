---
name: aion-payroll-calculation
description: Use when implementing or debugging payroll calculation (hours aggregation, collective agreements, supplements, CSV export).
---

# AION Payroll Calculation Skill

## Overview
Payroll calculates hours (regular, overtime, night, holiday), applies versioned collective agreements, generates records with SHA-256 hash linked to audit trail.

## When to Use
- Modifying payroll calculation logic
- Adding new supplement types
- Versioning collective agreements
- Debugging CSV export discrepancies

## Calculation Flow
```
Approved Shifts (period)
    │
    ▼
Aggregate per Employee
    │
    ▼
Apply Agreement Rules (versioned)
    ├─ Regular hours (base)
    ├─ Overtime (rate × hours)
    ├─ Night supplement (22:00-06:00)
    ├─ Holiday supplement
    └─ Custom supplements
    │
    ▼
Generate PayrollRecord + SHA-256 Hash
    │
    ▼
Audit Event (PAYROLL_CALCULATED)
    │
    ▼
CSV Export (SEPA-compatible)
```

## Collective Agreement Versioning
```typescript
interface AgreementVersion {
  version: string;           // "2024-v3"
  effectiveFrom: Date;
  effectiveTo?: Date;
  rules: {
    overtimeRate: number;    // 1.5, 2.0
    nightStart: string;      // "22:00"
    nightEnd: string;        // "06:00"
    nightRate: number;       // 0.25
    holidayRate: number;     // 2.0
    maxOvertimeMonthly: number;
    supplements: SupplementRule[];
  };
}
```

## Payroll Record (Immutable)
```typescript
interface PayrollRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  periodId: string;
  agreementVersion: string;
  hoursRegular: number;
  hoursOvertime: number;
  hoursNight: number;
  hoursHoliday: number;
  supplements: Supplement[];
  gross: number;
  net: number;
  hash: string;              // SHA256 of all above + prevHash
}
```

## Absences Integration (No Double-Count)
```typescript
// Approved absence = paid time, NOT worked hours
const workedHours = shiftsHours - absenceHours;
const paidHours = shiftsHours;  // Includes approved absences
```

## CSV Export Format
```csv
employee_id,period,regular_hours,overtime_hours,night_hours,holiday_hours,supplements,gross,net,hash
emp_001,2026-10,160,10,8,0,150.00,3250.00,2600.00,a1b2c3...
```

## Red Flags
| Thought | Reality |
|---------|---------|
| "Float math is fine for money" | Use integer cents or decimal library |
| "Agreement never changes" | Version everything - v1/v2 both active |
| "Absences don't affect payroll" | Approved absences = paid, not worked |

## Tests
- Unit: 50 shifts match manual calculation exactly
- Integration: CSV imports cleanly, hash verified
- Adversarial: Agreement versioning tested

## Related
- ADR-0001: Modular Monolith (payroll module)
- `server/modules/payroll/`
- `server/payroll-policy.ts`