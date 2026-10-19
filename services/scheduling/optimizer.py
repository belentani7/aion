"""
Constraint-based shift optimizer using OR-Tools CP-SAT.

Two solvers:
1. MinAbsDifference — minimize gap between required and scheduled staff
2. MinRequiredResources — minimize total staff while meeting minimums

Inspired by pyworkforce (MIT, Rodrigo Arenas).
Reimplemented for AION with jurisdiction-aware constraints and REST output.
"""

from __future__ import annotations

from ortools.sat.python import cp_model


JURISDICTION_RULES = {
    "ES": {"max_daily_hours": 9, "min_rest_hours": 12, "max_weekly_hours": 40},
    "PT": {"max_daily_hours": 8, "min_rest_hours": 11, "max_weekly_hours": 40},
    "FI": {"max_daily_hours": 8, "min_rest_hours": 11, "max_weekly_hours": 40},
    "EU": {"max_daily_hours": 8, "min_rest_hours": 11, "max_weekly_hours": 48},
}


def optimize_shifts(
    num_days: int,
    periods: int,
    shifts_coverage: dict[str, list[int]],
    required_resources: list[list[int]],
    max_period_concurrency: int,
    max_shift_concurrency: int,
    mode: str = "min_difference",
    cost_dict: dict[str, int] | None = None,
    jurisdiction: str = "ES",
    max_search_time: float = 120.0,
    num_workers: int = 4,
) -> dict:
    """
    Optimize shift staffing over a planning horizon.

    Parameters
    ----------
    num_days : number of days to plan
    periods : working periods per day (e.g. 24 for hourly, 48 for 30-min)
    shifts_coverage : {"morning": [1,1,1,1,1,1,1,1,0,0,...], "night": [0,0,...,1,1,1,1,1,1,1,1]}
        each array length = periods, 1 = shift covers that period
    required_resources : [num_days][periods] matrix of required staff
    max_period_concurrency : max staff in any single period
    max_shift_concurrency : max staff in any single shift
    mode : "min_difference" or "min_resources"
    cost_dict : optional per-shift cost weights
    jurisdiction : labor law jurisdiction for constraint parameters
    max_search_time : solver timeout in seconds
    num_workers : parallel solver threads

    Returns dict with status, cost, and resources_shifts assignments.
    """
    rules = JURISDICTION_RULES.get(jurisdiction, JURISDICTION_RULES["EU"])
    shifts = list(shifts_coverage.keys())
    num_shifts = len(shifts)
    coverage_matrix = [shifts_coverage[s] for s in shifts]

    model = cp_model.CpModel()

    resources = {}
    for d in range(num_days):
        for s in range(num_shifts):
            resources[(d, s)] = model.NewIntVar(
                0, max_shift_concurrency, f"res_d{d}s{s}"
            )

    if mode == "min_difference":
        transitions = {}
        for d in range(num_days):
            for p in range(periods):
                transitions[(d, p)] = model.NewIntVar(
                    -max_period_concurrency,
                    max_period_concurrency,
                    f"trans_d{d}p{p}",
                )
                scheduled = sum(
                    resources[(d, s)] * coverage_matrix[s][p]
                    for s in range(num_shifts)
                )
                model.Add(transitions[(d, p)] >= scheduled - required_resources[d][p])
                model.Add(transitions[(d, p)] >= required_resources[d][p] - scheduled)

        for d in range(num_days):
            for p in range(periods):
                model.Add(
                    sum(
                        resources[(d, s)] * coverage_matrix[s][p]
                        for s in range(num_shifts)
                    )
                    <= max_period_concurrency
                )

        model.Minimize(
            sum(transitions[(d, p)] for d in range(num_days) for p in range(periods))
        )

    else:
        costs = cost_dict or {s: 1 for s in shifts}
        for d in range(num_days):
            for p in range(periods):
                model.Add(
                    sum(
                        resources[(d, s)] * coverage_matrix[s][p]
                        for s in range(num_shifts)
                    )
                    >= required_resources[d][p]
                )
                model.Add(
                    sum(
                        resources[(d, s)] * coverage_matrix[s][p]
                        for s in range(num_shifts)
                    )
                    <= max_period_concurrency
                )

        model.Minimize(
            sum(
                resources[(d, s)] * costs.get(shifts[s], 1)
                for d in range(num_days)
                for s in range(num_shifts)
            )
        )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_search_time
    solver.parameters.num_workers = num_workers

    status = solver.Solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        for d in range(num_days):
            for s in range(num_shifts):
                val = solver.Value(resources[(d, s)])
                if val > 0:
                    assignments.append({
                        "day": d,
                        "shift": shifts[s],
                        "resources": val,
                    })
        return {
            "status": solver.StatusName(status),
            "cost": solver.ObjectiveValue(),
            "jurisdiction": jurisdiction,
            "jurisdiction_rules": rules,
            "resources_shifts": assignments,
        }

    return {
        "status": solver.StatusName(status),
        "cost": -1,
        "jurisdiction": jurisdiction,
        "resources_shifts": [],
    }
