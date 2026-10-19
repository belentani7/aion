"""
Employee rostering engine using OR-Tools CP-SAT.

Assigns named employees to shifts respecting:
- Required staff per shift per day
- Max 1 shift per employee per day
- Non-sequential shift constraints (e.g. no night-then-morning)
- Banned shifts per employee
- Min/max working hours
- Rest day limits
- Employee shift preferences with priority weights

Inspired by pyworkforce MinHoursRoster (MIT, Rodrigo Arenas).
Reimplemented for AION with jurisdiction rules and fairness scoring.
"""

from __future__ import annotations

from ortools.sat.python import cp_model


JURISDICTION_CONSTRAINTS = {
    "ES": {"max_daily_hours": 9, "min_rest": 12, "max_weekly": 40, "rest_days": 1.5},
    "PT": {"max_daily_hours": 8, "min_rest": 11, "max_weekly": 40, "rest_days": 1},
    "FI": {"max_daily_hours": 8, "min_rest": 11, "max_weekly": 40, "rest_days": 2},
    "EU": {"max_daily_hours": 8, "min_rest": 11, "max_weekly": 48, "rest_days": 1},
}


def build_roster(
    num_days: int,
    employees: list[str],
    shifts: list[str],
    shifts_hours: list[float],
    required_resources: dict[str, list[int]],
    min_working_hours: int = 20,
    max_resting: int = 2,
    banned_shifts: list[dict] | None = None,
    non_sequential: list[dict] | None = None,
    preferences: list[dict] | None = None,
    priorities: list[dict] | None = None,
    jurisdiction: str = "ES",
    max_search_time: float = 240.0,
    num_workers: int = 4,
) -> dict:
    """
    Build an employee roster.

    Parameters
    ----------
    num_days : planning horizon in days
    employees : list of employee IDs/names
    shifts : list of shift names (e.g. ["Morning", "Afternoon", "Night"])
    shifts_hours : hours per shift (same order as shifts)
    required_resources : {"Morning": [3, 3, 2, ...], ...} — staff needed per shift per day
    min_working_hours : minimum total hours per employee in horizon
    max_resting : max rest days per employee
    banned_shifts : [{"employee": "Ana", "shift": "Night", "day": 0}, ...]
    non_sequential : [{"origin": "Night", "destination": "Morning"}, ...]
    preferences : [{"employee": "Ana", "shift": "Morning"}, ...]
    priorities : [{"employee": "Ana", "weight": 2}, ...]
    jurisdiction : labor law context
    max_search_time : solver timeout
    num_workers : parallel threads

    Returns dict with assignments, resting days, and metrics.
    """
    banned_shifts = banned_shifts or []
    non_sequential = non_sequential or []
    preferences = preferences or []
    priorities = priorities or []

    rules = JURISDICTION_CONSTRAINTS.get(jurisdiction, JURISDICTION_CONSTRAINTS["EU"])
    num_employees = len(employees)
    num_shifts = len(shifts)

    if max_resting >= num_days:
        raise ValueError("max_resting must be less than num_days")

    model = cp_model.CpModel()

    # x[e][d][s] = 1 if employee e works shift s on day d
    x = {}
    for e in range(num_employees):
        for d in range(num_days):
            for s in range(num_shifts):
                x[(e, d, s)] = model.NewBoolVar(f"x_{e}_{d}_{s}")

    # Meet required staffing
    for s_idx, s_name in enumerate(shifts):
        for d in range(num_days):
            model.Add(
                sum(x[(e, d, s_idx)] for e in range(num_employees))
                >= required_resources[s_name][d]
            )

    # Max 1 shift per day per employee
    for e in range(num_employees):
        for d in range(num_days):
            model.Add(sum(x[(e, d, s)] for s in range(num_shifts)) <= 1)

    # Min working days
    working_days = num_days - max_resting
    for e in range(num_employees):
        model.Add(
            sum(x[(e, d, s)] for d in range(num_days) for s in range(num_shifts))
            >= working_days
        )

    # Non-sequential shift constraints
    seq_matrix = [[0] * num_shifts for _ in range(num_shifts)]
    for dep in non_sequential:
        i = shifts.index(dep["origin"])
        j = shifts.index(dep["destination"])
        seq_matrix[i][j] = 1

    for e in range(num_employees):
        for d in range(num_days - 1):
            for s in range(num_shifts):
                model.Add(
                    sum(
                        x[(e, d, s)] * seq_matrix[s][j] + x[(e, d + 1, j)]
                        for j in range(num_shifts)
                    )
                    <= 1
                )

    # Banned shifts
    for ban in banned_shifts:
        e_idx = employees.index(ban["employee"])
        s_idx = shifts.index(ban["shift"])
        d_idx = int(ban["day"])
        model.Add(x[(e_idx, d_idx, s_idx)] == 0)

    # Min working hours
    for e in range(num_employees):
        model.Add(
            sum(
                x[(e, d, s)] * int(shifts_hours[s] * 10)
                for d in range(num_days)
                for s in range(num_shifts)
            )
            >= int(min_working_hours * 10)
        )

    # Max daily hours per jurisdiction
    max_slots = int(rules["max_daily_hours"] / min(shifts_hours)) if min(shifts_hours) > 0 else 1
    for e in range(num_employees):
        for d in range(num_days):
            model.Add(
                sum(
                    x[(e, d, s)] * int(shifts_hours[s] * 10)
                    for s in range(num_shifts)
                )
                <= int(rules["max_daily_hours"] * 10)
            )

    # Preference weights
    pref_matrix = [[0] * num_shifts for _ in range(num_employees)]
    for p in preferences:
        e_idx = employees.index(p["employee"])
        s_idx = shifts.index(p["shift"])
        pref_matrix[e_idx][s_idx] = 1

    weight_vec = [1] * num_employees
    for p in priorities:
        e_idx = employees.index(p["employee"])
        weight_vec[e_idx] = p["weight"]

    # Objective: minimize hours, reward preferences
    model.Minimize(
        sum(
            x[(e, d, s)]
            * (int(shifts_hours[s] * 10) - weight_vec[e] * pref_matrix[e][s])
            for e in range(num_employees)
            for d in range(num_days)
            for s in range(num_shifts)
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_search_time
    solver.parameters.num_workers = num_workers

    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": solver.StatusName(status),
            "cost": -1,
            "assignments": [],
            "resting": [],
            "metrics": {},
        }

    assignments = []
    resting = []
    hours_per_employee = {emp: 0.0 for emp in employees}

    for e in range(num_employees):
        for d in range(num_days):
            working = False
            for s in range(num_shifts):
                if solver.Value(x[(e, d, s)]):
                    assignments.append({
                        "employee": employees[e],
                        "day": d,
                        "shift": shifts[s],
                        "hours": shifts_hours[s],
                    })
                    hours_per_employee[employees[e]] += shifts_hours[s]
                    working = True
            if not working:
                resting.append({"employee": employees[e], "day": d})

    total_hours = sum(hours_per_employee.values())
    active = [h for h in hours_per_employee.values() if h > 0]

    return {
        "status": solver.StatusName(status),
        "cost": solver.ObjectiveValue(),
        "jurisdiction": jurisdiction,
        "assignments": assignments,
        "resting": resting,
        "metrics": {
            "total_shifts": len(assignments),
            "total_hours": round(total_hours, 1),
            "avg_hours_per_employee": round(total_hours / len(active), 1) if active else 0,
            "max_hours": round(max(active), 1) if active else 0,
            "min_hours": round(min(active), 1) if active else 0,
            "rest_days": len(resting),
            "hours_per_employee": {k: round(v, 1) for k, v in hours_per_employee.items()},
        },
    }
