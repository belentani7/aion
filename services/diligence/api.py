"""
AION Diligence Service — FastAPI REST API

Protocol de Diligencia Debida:
- /risk/assess          — Full risk assessment
- /risk/compliance      — Labor compliance risk scoring
- /risk/fairness        — Schedule equity risk
- /risk/documents       — Document expiry risk
- /workflows/templates  — Available workflow templates
- /workflows/create     — Create workflow instance
- /workflows/advance    — Advance workflow step
- /workflows/summary    — Workflow status summary
- /reports/risk         — Risk assessment report
- /reports/compliance   — Compliance audit report
- /reports/workflows    — Workflow status report
- /reports/trend        — Risk trend analysis
- /health               — Service health
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from risk_engine import (
    full_risk_assessment,
    assess_labor_compliance,
    assess_schedule_fairness,
    assess_document_expiry,
    assess_jurisdictional_exposure,
)
from workflows import (
    create_workflow,
    advance_step,
    get_workflow_summary,
    list_templates,
)
from reports import (
    generate_risk_report,
    generate_compliance_report,
    generate_workflow_report,
    generate_trend_report,
    REGULATORY_REFERENCES,
)

app = FastAPI(
    title="AION Diligence Protocol",
    version="1.0.0",
    description="Due diligence protocol: risk assessment, compliance workflows, and regulatory reporting.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()

# In-memory workflow store (production: DB)
_workflows: dict[str, dict] = {}


# ── Health ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "aion-diligence",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - START_TIME),
        "modules": ["risk_engine", "workflows", "reports"],
        "active_workflows": len(_workflows),
    }


# ── Risk Assessment ────────────────────────────────────────────────

class RiskRequest(BaseModel):
    entity_id: str
    entity_type: str = Field(default="tenant", pattern="^(tenant|department|employee|vendor)$")
    violations: list[dict] = []
    fairness_data: dict = {}
    audit_entries: list[dict] = []
    documents: list[dict] = []
    jurisdictions: list[str] = ["ES"]


@app.post("/risk/assess")
def risk_assess(req: RiskRequest):
    try:
        result = full_risk_assessment(
            entity_id=req.entity_id,
            entity_type=req.entity_type,
            violations=req.violations,
            fairness_data=req.fairness_data,
            audit_entries=req.audit_entries,
            documents=req.documents,
            jurisdictions=req.jurisdictions,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ComplianceRiskRequest(BaseModel):
    violations: list[dict]


@app.post("/risk/compliance")
def risk_compliance(req: ComplianceRiskRequest):
    factors = assess_labor_compliance(req.violations)
    return {
        "factors": [
            {
                "category": f.category,
                "description": f.description,
                "severity": f.severity.value,
                "score": f.score,
                "mitigation": f.mitigation,
            }
            for f in factors
        ]
    }


class FairnessRiskRequest(BaseModel):
    fairness_data: dict


@app.post("/risk/fairness")
def risk_fairness(req: FairnessRiskRequest):
    factors = assess_schedule_fairness(req.fairness_data)
    return {
        "factors": [
            {
                "category": f.category,
                "description": f.description,
                "severity": f.severity.value,
                "score": f.score,
                "mitigation": f.mitigation,
            }
            for f in factors
        ]
    }


class DocumentRiskRequest(BaseModel):
    documents: list[dict]


@app.post("/risk/documents")
def risk_documents(req: DocumentRiskRequest):
    factors = assess_document_expiry(req.documents)
    return {
        "factors": [
            {
                "category": f.category,
                "description": f.description,
                "severity": f.severity.value,
                "score": f.score,
                "evidence": f.evidence,
                "mitigation": f.mitigation,
            }
            for f in factors
        ]
    }


# ── Workflows ───────────────────────────────────────────────────────

@app.get("/workflows/templates")
def workflow_templates():
    return {"templates": list_templates()}


class WorkflowCreateRequest(BaseModel):
    template_id: str
    entity_id: str
    entity_type: str = "employee"
    jurisdiction: str = Field(default="ES", pattern="^(ES|PT|FI|EU)$")
    assigned_to: str = ""
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    deadline_days: int = Field(default=30, gt=0)
    metadata: dict = {}


@app.post("/workflows/create")
def workflow_create(req: WorkflowCreateRequest):
    try:
        wf = create_workflow(
            template_id=req.template_id,
            entity_id=req.entity_id,
            entity_type=req.entity_type,
            jurisdiction=req.jurisdiction,
            assigned_to=req.assigned_to,
            priority=req.priority,
            deadline_days=req.deadline_days,
            metadata=req.metadata,
        )
        _workflows[wf["workflow_id"]] = wf
        return wf
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class WorkflowAdvanceRequest(BaseModel):
    workflow_id: str
    step_id: str
    status: str = Field(default="completed", pattern="^(in_progress|completed|failed|skipped)$")
    evidence: list[str] = []
    notes: str = ""


@app.post("/workflows/advance")
def workflow_advance(req: WorkflowAdvanceRequest):
    if req.workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    try:
        wf = advance_step(
            workflow=_workflows[req.workflow_id],
            step_id=req.step_id,
            status=req.status,
            evidence=req.evidence,
            notes=req.notes,
        )
        _workflows[req.workflow_id] = wf
        return wf
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/workflows/{workflow_id}")
def workflow_get(workflow_id: str):
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _workflows[workflow_id]


@app.get("/workflows/{workflow_id}/summary")
def workflow_summary(workflow_id: str):
    if workflow_id not in _workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return get_workflow_summary(_workflows[workflow_id])


@app.get("/workflows")
def workflow_list(entity_id: str = "", status: str = ""):
    results = list(_workflows.values())
    if entity_id:
        results = [w for w in results if w["entity_id"] == entity_id]
    if status:
        results = [w for w in results if w["status"] == status]
    return {
        "total": len(results),
        "workflows": [
            {
                "workflow_id": w["workflow_id"],
                "name": w["name"],
                "entity_id": w["entity_id"],
                "status": w["status"],
                "progress": w["progress"],
                "priority": w["priority"],
                "deadline": w["deadline"],
            }
            for w in results
        ],
    }


# ── Reports ─────────────────────────────────────────────────────────

class RiskReportRequest(BaseModel):
    risk_assessment: dict
    jurisdiction: str = "ES"
    period: str = ""
    tenant_name: str = ""


@app.post("/reports/risk")
def report_risk(req: RiskReportRequest):
    return generate_risk_report(
        risk_assessment=req.risk_assessment,
        jurisdiction=req.jurisdiction,
        period=req.period,
        tenant_name=req.tenant_name,
    )


class ComplianceReportRequest(BaseModel):
    violations: list[dict] = []
    schedules_checked: int = 0
    employees_checked: int = 0
    jurisdiction: str = "ES"
    period: str = ""
    tenant_name: str = ""


@app.post("/reports/compliance")
def report_compliance(req: ComplianceReportRequest):
    return generate_compliance_report(
        violations=req.violations,
        schedules_checked=req.schedules_checked,
        employees_checked=req.employees_checked,
        jurisdiction=req.jurisdiction,
        period=req.period,
        tenant_name=req.tenant_name,
    )


class WorkflowReportRequest(BaseModel):
    workflow_ids: list[str] = []
    tenant_name: str = ""


@app.post("/reports/workflows")
def report_workflows(req: WorkflowReportRequest):
    if req.workflow_ids:
        workflows = [_workflows[wid] for wid in req.workflow_ids if wid in _workflows]
    else:
        workflows = list(_workflows.values())
    return generate_workflow_report(workflows=workflows, tenant_name=req.tenant_name)


class TrendReportRequest(BaseModel):
    historical_scores: list[dict]
    jurisdiction: str = "ES"
    tenant_name: str = ""


@app.post("/reports/trend")
def report_trend(req: TrendReportRequest):
    return generate_trend_report(
        historical_scores=req.historical_scores,
        jurisdiction=req.jurisdiction,
        tenant_name=req.tenant_name,
    )


# ── Regulatory References ──────────────────────────────────────────

@app.get("/regulations")
def regulations(jurisdiction: str = "ES"):
    refs = REGULATORY_REFERENCES.get(jurisdiction)
    if not refs:
        raise HTTPException(status_code=404, detail=f"Unknown jurisdiction: {jurisdiction}")
    return {"jurisdiction": jurisdiction, "references": refs}


@app.get("/regulations/all")
def all_regulations():
    return {"jurisdictions": REGULATORY_REFERENCES}


# ── Capabilities ────────────────────────────────────────────────────

@app.get("/capabilities")
def capabilities():
    return {
        "protocol": "AION Diligence Protocol",
        "version": "1.0.0",
        "modules": {
            "risk_engine": {
                "description": "Multi-factor risk assessment engine",
                "assessors": [
                    "labor_compliance", "schedule_equity", "audit_integrity",
                    "document_expiry", "jurisdictional_exposure",
                ],
            },
            "workflows": {
                "description": "Structured due diligence workflow management",
                "templates": [t["id"] for t in list_templates()],
            },
            "reports": {
                "description": "Regulatory-aware report generation",
                "types": ["risk_assessment", "compliance_audit", "workflow_status", "trend_analysis"],
            },
        },
        "jurisdictions": list(REGULATORY_REFERENCES.keys()),
    }
