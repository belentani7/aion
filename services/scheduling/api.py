"""
AION Scheduling Service — FastAPI REST API

Exposes four engines:
- /demand       — Erlang C demand forecasting
- /optimize     — OR-Tools CP-SAT shift optimization
- /roster       — Employee rostering with preferences
- /fairness     — Schedule equity evaluation
- /health       — Service health check

All engines support EU labor jurisdictions: ES, PT, FI, EU.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from demand import ErlangC, forecast_demand
from optimizer import optimize_shifts
from roster import build_roster
from fairness import evaluate_fairness

app = FastAPI(
    title="AION Scheduling Service",
    version="1.0.0",
    description="Workforce scheduling: demand forecasting, shift optimization, rostering, and fairness evaluation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()


# ── Health ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "aion-scheduling",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - START_TIME),
        "engines": ["demand", "optimizer", "roster", "fairness"],
    }


# ── Demand Forecasting ─────────────────────────────────────────────

class DemandInterval(BaseModel):
    id: str = ""
    transactions: float = Field(gt=0)
    aht: float = Field(gt=0)


class DemandRequest(BaseModel):
    intervals: list[DemandInterval]
    asa: float = Field(default=0.33, gt=0, description="Target avg speed of answer (minutes)")
    interval_length: int = Field(default=30, gt=0, description="Interval duration (minutes)")
    shrinkage: float = Field(default=0.30, ge=0, lt=1)
    service_level: float = Field(default=0.80, ge=0, le=1)
    max_occupancy: float = Field(default=0.85, gt=0, le=1)


@app.post("/demand")
def demand_forecast(req: DemandRequest):
    try:
        results = forecast_demand(
            intervals=[iv.model_dump() for iv in req.intervals],
            asa=req.asa,
            interval_length=req.interval_length,
            shrinkage=req.shrinkage,
            service_level=req.service_level,
            max_occupancy=req.max_occupancy,
        )
        return {
            "status": "ok",
            "total_positions": sum(r["positions"] for r in results),
            "intervals": results,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Shift Optimization ─────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    num_days: int = Field(gt=0)
    periods: int = Field(gt=0)
    shifts_coverage: dict[str, list[int]]
    required_resources: list[list[int]]
    max_period_concurrency: int = Field(gt=0)
    max_shift_concurrency: int = Field(gt=0)
    mode: str = Field(default="min_difference", pattern="^(min_difference|min_resources)$")
    cost_dict: dict[str, int] | None = None
    jurisdiction: str = Field(default="ES", pattern="^(ES|PT|FI|EU)$")
    max_search_time: float = Field(default=120.0, gt=0)


@app.post("/optimize")
def optimize(req: OptimizeRequest):
    try:
        result = optimize_shifts(
            num_days=req.num_days,
            periods=req.periods,
            shifts_coverage=req.shifts_coverage,
            required_resources=req.required_resources,
            max_period_concurrency=req.max_period_concurrency,
            max_shift_concurrency=req.max_shift_concurrency,
            mode=req.mode,
            cost_dict=req.cost_dict,
            jurisdiction=req.jurisdiction,
            max_search_time=req.max_search_time,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Employee Rostering ──────────────────────────────────────────────

class BannedShift(BaseModel):
    employee: str
    shift: str
    day: int


class NonSequential(BaseModel):
    origin: str
    destination: str


class Preference(BaseModel):
    employee: str
    shift: str


class Priority(BaseModel):
    employee: str
    weight: int = 1


class RosterRequest(BaseModel):
    num_days: int = Field(gt=0)
    employees: list[str]
    shifts: list[str]
    shifts_hours: list[float]
    required_resources: dict[str, list[int]]
    min_working_hours: int = Field(default=20, ge=0)
    max_resting: int = Field(default=2, ge=0)
    banned_shifts: list[BannedShift] = []
    non_sequential: list[NonSequential] = []
    preferences: list[Preference] = []
    priorities: list[Priority] = []
    jurisdiction: str = Field(default="ES", pattern="^(ES|PT|FI|EU)$")
    max_search_time: float = Field(default=240.0, gt=0)


@app.post("/roster")
def roster(req: RosterRequest):
    try:
        result = build_roster(
            num_days=req.num_days,
            employees=req.employees,
            shifts=req.shifts,
            shifts_hours=req.shifts_hours,
            required_resources=req.required_resources,
            min_working_hours=req.min_working_hours,
            max_resting=req.max_resting,
            banned_shifts=[b.model_dump() for b in req.banned_shifts],
            non_sequential=[n.model_dump() for n in req.non_sequential],
            preferences=[p.model_dump() for p in req.preferences],
            priorities=[p.model_dump() for p in req.priorities],
            jurisdiction=req.jurisdiction,
            max_search_time=req.max_search_time,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Fairness Evaluation ────────────────────────────────────────────

class FairnessAssignment(BaseModel):
    employee: str
    shift: str = "default"
    day: int = 0
    hours: float = 8.0


class FairnessRequest(BaseModel):
    assignments: list[FairnessAssignment]
    employees: list[str]
    shifts: list[str] | None = None


@app.post("/fairness")
def fairness(req: FairnessRequest):
    try:
        result = evaluate_fairness(
            assignments=[a.model_dump() for a in req.assignments],
            employees=req.employees,
            shifts=req.shifts,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Capabilities ────────────────────────────────────────────────────

@app.get("/capabilities")
def capabilities():
    return {
        "engines": {
            "demand": {
                "description": "Erlang C queue-based demand forecasting",
                "method": "POST /demand",
                "features": ["multi-interval", "shrinkage", "occupancy-cap"],
            },
            "optimizer": {
                "description": "OR-Tools CP-SAT shift optimization",
                "method": "POST /optimize",
                "features": ["min-difference", "min-resources", "jurisdiction-rules", "cost-weights"],
            },
            "roster": {
                "description": "Named employee rostering with preferences",
                "method": "POST /roster",
                "features": ["banned-shifts", "non-sequential", "preferences", "priorities", "jurisdiction"],
            },
            "fairness": {
                "description": "Schedule equity evaluation",
                "method": "POST /fairness",
                "features": ["variance", "gini-coefficient", "per-shift-breakdown", "fairness-score"],
            },
        },
        "jurisdictions": ["ES", "PT", "FI", "EU"],
    }
