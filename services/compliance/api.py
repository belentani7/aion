"""
AION Compliance REST API — FastAPI wrapper around ComplianceEngine.

Endpoints:
  POST /validate       — validate a list of shifts
  POST /validate/file  — validate shifts from uploaded JSON
  GET  /rules          — list configured legal rules
  GET  /jurisdictions  — list supported jurisdictions
  GET  /health         — service health check
"""
import time
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from agent import ComplianceEngine, Shift, ComplianceViolation

app = FastAPI(
    title="AION Compliance API",
    version="1.0.0",
    description="EU labor law compliance validation (ES/PT/FI/UE)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

START_TIME = time.monotonic()


class ShiftInput(BaseModel):
    employee_id: str = ""
    start: datetime
    end: datetime
    is_night: bool = False

    @field_validator("end")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start")
        if start and v <= start:
            raise ValueError("end must be after start")
        return v


class ValidateRequest(BaseModel):
    jurisdiction: str = "ES"
    shifts: List[ShiftInput]


class ViolationOut(BaseModel):
    rule: str
    severity: str
    message: str
    shift_id: Optional[str] = None


class ValidateResponse(BaseModel):
    jurisdiction: str
    total_shifts: int
    violations: List[ViolationOut]
    compliant: bool
    checked_at: str


class ScheduleMetrics(BaseModel):
    total_hours: float
    night_hours: float
    rest_violations: int
    max_daily_violation: bool


def _to_shifts(inputs: List[ShiftInput]) -> List[Shift]:
    return [
        Shift(
            employee_id=s.employee_id,
            start=s.start.replace(tzinfo=None) if s.start.tzinfo else s.start,
            end=s.end.replace(tzinfo=None) if s.end.tzinfo else s.end,
            is_night=s.is_night,
        )
        for s in inputs
    ]


def _to_violation_out(v: ComplianceViolation) -> ViolationOut:
    return ViolationOut(
        rule=v.rule,
        severity=v.severity,
        message=v.message,
        shift_id=v.shift_id,
    )


@app.post("/validate", response_model=ValidateResponse)
async def validate_shifts(req: ValidateRequest):
    """Validate a list of shifts against labor law rules."""
    if not req.shifts:
        raise HTTPException(status_code=422, detail="At least one shift required")
    if len(req.shifts) > 1000:
        raise HTTPException(status_code=422, detail="Maximum 1000 shifts per request")

    engine = ComplianceEngine(req.jurisdiction)
    shifts = _to_shifts(req.shifts)
    violations = engine.validate_weekly_schedule(shifts)

    return ValidateResponse(
        jurisdiction=engine.jurisdiction,
        total_shifts=len(shifts),
        violations=[_to_violation_out(v) for v in violations],
        compliant=len(violations) == 0,
        checked_at=datetime.now().isoformat(),
    )


@app.post("/validate/file", response_model=ValidateResponse)
async def validate_shifts_file(
    file: UploadFile = File(...),
    jurisdiction: str = Query("ES", description="Jurisdiction code: ES, PT, FI"),
):
    """Validate shifts from an uploaded JSON file."""
    import json

    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=422, detail="Only JSON files accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid JSON")

    engine = ComplianceEngine(jurisdiction)
    if isinstance(payload, dict):
        items = payload.get("shifts", [])
    elif isinstance(payload, list):
        items = payload
    else:
        raise HTTPException(status_code=422, detail="Expected array or {shifts: [...]}")

    shifts = []
    for item in items:
        try:
            shifts.append(Shift.from_dict(item))
        except (ValueError, KeyError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid shift: {exc}")

    violations = engine.validate_weekly_schedule(shifts)

    return ValidateResponse(
        jurisdiction=engine.jurisdiction,
        total_shifts=len(shifts),
        violations=[_to_violation_out(v) for v in violations],
        compliant=len(violations) == 0,
        checked_at=datetime.now().isoformat(),
    )


@app.get("/rules")
async def list_rules(jurisdiction: str = Query("ES")):
    """List configured legal rules for a jurisdiction."""
    engine = ComplianceEngine(jurisdiction)
    rules = []
    for reg_id, (jur, norm, param) in sorted(engine.RULES.items()):
        if jur == engine.jurisdiction or jurisdiction == "ALL":
            rules.append({"id": reg_id, "jurisdiction": jur, "norm": norm, "parameter": param})
    return {"jurisdiction": engine.jurisdiction, "rules": rules}


@app.get("/jurisdictions")
async def list_jurisdictions():
    """List supported jurisdictions with their parameters."""
    jurisdictions = {
        "ES": {
            "name": "Spain",
            "norm": "Estatuto de los Trabajadores",
            "max_daily_hours": ComplianceEngine.ES_MAX_DAILY_HOURS,
            "daily_rest_hours": ComplianceEngine.ES_DAILY_REST_HOURS,
            "max_weekly_hours": ComplianceEngine.ES_MAX_WEEKLY_HOURS,
        },
        "PT": {
            "name": "Portugal",
            "norm": "Código do Trabalho",
            "max_daily_hours": ComplianceEngine.PT_MAX_DAILY_HOURS,
            "daily_rest_hours": ComplianceEngine.PT_DAILY_REST_HOURS,
            "max_weekly_hours": ComplianceEngine.PT_MAX_WEEKLY_HOURS,
        },
        "FI": {
            "name": "Finland",
            "norm": "Working Hours Act 872/2019",
            "max_daily_hours": ComplianceEngine.FI_MAX_DAILY_HOURS,
            "daily_rest_hours": ComplianceEngine.FI_DAILY_REST_HOURS,
            "max_weekly_hours": ComplianceEngine.FI_MAX_WEEKLY_HOURS,
        },
        "EU": {
            "name": "European Union",
            "norm": "Directive 2003/88/CE",
            "max_daily_hours": ComplianceEngine.EU_MAX_DAILY_HOURS,
            "daily_rest_hours": ComplianceEngine.EU_DAILY_REST_HOURS,
            "max_weekly_hours": 48,
        },
    }
    return {"jurisdictions": jurisdictions}


@app.post("/metrics", response_model=ScheduleMetrics)
async def schedule_metrics(req: ValidateRequest):
    """Calculate schedule metrics (hours, night work, rest violations)."""
    engine = ComplianceEngine(req.jurisdiction)
    shifts = _to_shifts(req.shifts)
    violations = engine.validate_weekly_schedule(shifts)

    total_hours = sum((s.end - s.start).total_seconds() / 3600 for s in shifts)
    night_hours = sum(engine._calculate_night_hours(s) for s in shifts if s.is_night)
    rest_violations = sum(1 for v in violations if v.rule == "Daily Rest")
    max_daily_violation = any(v.rule == "Max Daily Hours" for v in violations)

    return ScheduleMetrics(
        total_hours=round(total_hours, 2),
        night_hours=round(night_hours, 2),
        rest_violations=rest_violations,
        max_daily_violation=max_daily_violation,
    )


@app.get("/health")
async def health():
    """Service health check."""
    uptime = time.monotonic() - START_TIME
    return {
        "status": "healthy",
        "service": "aion-compliance",
        "version": "1.0.0",
        "uptime_seconds": round(uptime, 1),
        "jurisdictions": ["ES", "PT", "FI", "EU"],
    }


if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
