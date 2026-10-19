"""
Fairness metrics for shift distribution.

Evaluates how equitably shifts are distributed among employees,
both overall and within monthly windows.

Inspired by genetic-shift-scheduler (Apache 2.0, ordenador).
Reimplemented as standalone evaluator for AION.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime


def _variance(counts: dict[str, int], expected: float) -> float:
    if not counts:
        return 0.0
    return sum((c - expected) ** 2 for c in counts.values()) / max(len(counts), 1)


def _gini(values: list[float]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    cumulative = 0.0
    gini_sum = 0.0
    for i, v in enumerate(sorted_vals):
        cumulative += v
        gini_sum += (2 * (i + 1) - n - 1) * v
    return gini_sum / (n * total)


def evaluate_fairness(
    assignments: list[dict],
    employees: list[str],
    shifts: list[str] | None = None,
) -> dict:
    """
    Evaluate fairness of a schedule.

    Parameters
    ----------
    assignments : list of {"employee": str, "shift": str, "day": int, ...}
    employees : all employee IDs (including those with 0 shifts)
    shifts : optional list of shift names to break down by type

    Returns
    -------
    dict with overall and per-shift fairness metrics:
    - variance: statistical variance of shift counts
    - gini: Gini coefficient (0 = perfect equality, 1 = total inequality)
    - max_gap: difference between most and least loaded employee
    - per_shift: breakdown by shift type
    - score: 0-100 fairness score (100 = perfectly fair)
    """
    total_counts: dict[str, int] = defaultdict(int)
    shift_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    hours_counts: dict[str, float] = defaultdict(float)

    for a in assignments:
        emp = a["employee"]
        shift = a.get("shift", "unknown")
        hours = a.get("hours", 8)
        total_counts[emp] += 1
        shift_counts[shift][emp] += 1
        hours_counts[emp] += hours

    for emp in employees:
        total_counts.setdefault(emp, 0)
        hours_counts.setdefault(emp, 0.0)

    total_shifts = sum(total_counts.values())
    expected = total_shifts / max(len(employees), 1)

    counts_list = [total_counts.get(e, 0) for e in employees]
    hours_list = [hours_counts.get(e, 0.0) for e in employees]

    variance = _variance(total_counts, expected)
    gini = _gini(counts_list)
    max_gap = max(counts_list) - min(counts_list) if counts_list else 0

    per_shift = {}
    detected_shifts = shifts or list(shift_counts.keys())
    for s in detected_shifts:
        s_counts = shift_counts.get(s, {})
        for emp in employees:
            s_counts.setdefault(emp, 0)
        s_list = [s_counts.get(e, 0) for e in employees]
        s_total = sum(s_list)
        s_expected = s_total / max(len(employees), 1)
        per_shift[s] = {
            "variance": round(_variance(s_counts, s_expected), 3),
            "gini": round(_gini(s_list), 3),
            "max_gap": max(s_list) - min(s_list) if s_list else 0,
            "total": s_total,
        }

    raw_score = max(0, 100 - (variance * 10) - (gini * 50) - (max_gap * 2))
    score = round(min(100, max(0, raw_score)), 1)

    return {
        "total_shifts": total_shifts,
        "total_employees": len(employees),
        "expected_per_employee": round(expected, 1),
        "variance": round(variance, 3),
        "gini": round(gini, 3),
        "max_gap": max_gap,
        "score": score,
        "per_employee": {e: total_counts.get(e, 0) for e in employees},
        "hours_per_employee": {e: round(hours_counts.get(e, 0.0), 1) for e in employees},
        "per_shift": per_shift,
    }
