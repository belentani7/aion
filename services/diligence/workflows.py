"""
AION Due Diligence Workflows — structured checklist/process engine.

Manages diligence processes:
- Onboarding diligence (new employee/contractor)
- Periodic compliance review
- Incident investigation
- Jurisdiction change audit
- Supplier/vendor due diligence

Each workflow = ordered steps with:
- Required evidence (documents, checks, approvals)
- Status tracking (pending/in_progress/completed/blocked/failed)
- Responsibility assignment
- Deadline enforcement
- Audit trail integration
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any


class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# ── Workflow Templates ──────────────────────────────────────────────

TEMPLATES: dict[str, dict] = {
    "employee_onboarding": {
        "name": "Employee Onboarding Due Diligence",
        "description": "Verify new employee documentation, compliance, and readiness",
        "jurisdiction_aware": True,
        "steps": [
            {
                "id": "identity_verification",
                "name": "Identity Verification",
                "description": "Verify government-issued ID and work authorization",
                "required_evidence": ["government_id", "work_permit"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "contract_review",
                "name": "Employment Contract Review",
                "description": "Review contract terms against jurisdiction labor laws",
                "required_evidence": ["signed_contract"],
                "auto_check": True,
                "blocking": True,
            },
            {
                "id": "compliance_check",
                "name": "Labor Compliance Pre-check",
                "description": "Validate working hours, rest periods, and compensation against jurisdiction rules",
                "required_evidence": ["proposed_schedule"],
                "auto_check": True,
                "blocking": True,
            },
            {
                "id": "training_verification",
                "name": "Required Training Completion",
                "description": "Verify mandatory safety and compliance training",
                "required_evidence": ["training_certificate"],
                "auto_check": False,
                "blocking": False,
            },
            {
                "id": "system_access",
                "name": "System Access Provisioning",
                "description": "Set up employee accounts and role-based access",
                "required_evidence": ["access_confirmation"],
                "auto_check": False,
                "blocking": False,
            },
        ],
    },
    "periodic_compliance_review": {
        "name": "Periodic Compliance Review",
        "description": "Quarterly review of labor compliance across all departments",
        "jurisdiction_aware": True,
        "steps": [
            {
                "id": "schedule_audit",
                "name": "Schedule Compliance Audit",
                "description": "Validate all active schedules against jurisdiction rules",
                "required_evidence": ["compliance_report"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "overtime_review",
                "name": "Overtime Analysis",
                "description": "Review overtime patterns and compensation compliance",
                "required_evidence": ["overtime_report"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "fairness_audit",
                "name": "Shift Fairness Audit",
                "description": "Evaluate equity of shift distribution across employees",
                "required_evidence": ["fairness_report"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "document_expiry_check",
                "name": "Document Expiry Review",
                "description": "Check all employee documents for upcoming expirations",
                "required_evidence": ["expiry_report"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "risk_assessment",
                "name": "Risk Assessment Update",
                "description": "Update risk scores based on findings",
                "required_evidence": ["risk_report"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "corrective_actions",
                "name": "Corrective Action Plan",
                "description": "Define and assign corrective actions for findings",
                "required_evidence": ["action_plan"],
                "auto_check": False,
                "blocking": True,
            },
        ],
    },
    "incident_investigation": {
        "name": "Compliance Incident Investigation",
        "description": "Investigate and resolve a compliance violation or incident",
        "jurisdiction_aware": True,
        "steps": [
            {
                "id": "incident_logging",
                "name": "Incident Registration",
                "description": "Document the incident with all relevant details",
                "required_evidence": ["incident_report"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "impact_assessment",
                "name": "Impact Assessment",
                "description": "Evaluate the scope and severity of the incident",
                "required_evidence": ["impact_analysis"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "root_cause",
                "name": "Root Cause Analysis",
                "description": "Identify the root cause of the incident",
                "required_evidence": ["rca_document"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "remediation",
                "name": "Remediation Implementation",
                "description": "Implement fixes to prevent recurrence",
                "required_evidence": ["remediation_proof"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "verification",
                "name": "Resolution Verification",
                "description": "Verify the fix is effective and compliant",
                "required_evidence": ["verification_report"],
                "auto_check": True,
                "blocking": True,
            },
            {
                "id": "closure",
                "name": "Incident Closure",
                "description": "Close the incident with final documentation",
                "required_evidence": ["closure_sign_off"],
                "auto_check": False,
                "blocking": False,
            },
        ],
    },
    "vendor_due_diligence": {
        "name": "Vendor/Supplier Due Diligence",
        "description": "Assess third-party labor compliance and risk",
        "jurisdiction_aware": True,
        "steps": [
            {
                "id": "vendor_registration",
                "name": "Vendor Registration",
                "description": "Collect and verify vendor business documentation",
                "required_evidence": ["business_registration", "tax_id"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "labor_practices",
                "name": "Labor Practices Assessment",
                "description": "Evaluate vendor's labor compliance and working conditions",
                "required_evidence": ["labor_compliance_declaration"],
                "auto_check": False,
                "blocking": True,
            },
            {
                "id": "risk_scoring",
                "name": "Vendor Risk Scoring",
                "description": "Calculate risk score based on collected evidence",
                "required_evidence": ["risk_assessment"],
                "auto_check": True,
                "blocking": False,
            },
            {
                "id": "approval",
                "name": "Approval Decision",
                "description": "Approve or reject vendor based on due diligence findings",
                "required_evidence": ["approval_decision"],
                "auto_check": False,
                "blocking": True,
            },
        ],
    },
}


# ── Workflow Instance Management ────────────────────────────────────

def create_workflow(
    template_id: str,
    entity_id: str,
    entity_type: str = "employee",
    jurisdiction: str = "ES",
    assigned_to: str = "",
    priority: str = "normal",
    deadline_days: int = 30,
    metadata: dict | None = None,
) -> dict:
    """Create a new workflow instance from a template."""
    if template_id not in TEMPLATES:
        raise ValueError(f"Unknown template: {template_id}. Available: {list(TEMPLATES.keys())}")

    template = TEMPLATES[template_id]
    workflow_id = str(uuid.uuid4())[:12]
    now = datetime.utcnow()
    deadline = now + timedelta(days=deadline_days)

    steps = []
    for i, step_def in enumerate(template["steps"]):
        steps.append({
            "id": step_def["id"],
            "order": i,
            "name": step_def["name"],
            "description": step_def["description"],
            "status": StepStatus.PENDING.value,
            "required_evidence": step_def["required_evidence"],
            "provided_evidence": [],
            "auto_check": step_def["auto_check"],
            "blocking": step_def["blocking"],
            "assigned_to": assigned_to,
            "started_at": None,
            "completed_at": None,
            "notes": "",
        })

    return {
        "workflow_id": workflow_id,
        "template_id": template_id,
        "name": template["name"],
        "description": template["description"],
        "entity_id": entity_id,
        "entity_type": entity_type,
        "jurisdiction": jurisdiction,
        "status": WorkflowStatus.ACTIVE.value,
        "priority": priority,
        "assigned_to": assigned_to,
        "steps": steps,
        "progress": 0.0,
        "created_at": now.isoformat() + "Z",
        "deadline": deadline.isoformat() + "Z",
        "completed_at": None,
        "metadata": metadata or {},
        "audit_hash": _hash_workflow(workflow_id, now.isoformat()),
    }


def advance_step(
    workflow: dict,
    step_id: str,
    status: str = "completed",
    evidence: list[str] | None = None,
    notes: str = "",
) -> dict:
    """Advance a step in the workflow."""
    now = datetime.utcnow()

    step = None
    for s in workflow["steps"]:
        if s["id"] == step_id:
            step = s
            break

    if not step:
        raise ValueError(f"Step '{step_id}' not found in workflow")

    # Check if previous blocking steps are completed
    for s in workflow["steps"]:
        if s["order"] < step["order"] and s["blocking"] and s["status"] != StepStatus.COMPLETED.value:
            raise ValueError(f"Blocking step '{s['id']}' must be completed first")

    step["status"] = status
    if evidence:
        step["provided_evidence"].extend(evidence)
    if notes:
        step["notes"] = notes
    if status == StepStatus.IN_PROGRESS.value and not step["started_at"]:
        step["started_at"] = now.isoformat() + "Z"
    if status in (StepStatus.COMPLETED.value, StepStatus.FAILED.value, StepStatus.SKIPPED.value):
        step["completed_at"] = now.isoformat() + "Z"

    # Update progress
    total = len(workflow["steps"])
    done = sum(1 for s in workflow["steps"] if s["status"] in ("completed", "skipped"))
    workflow["progress"] = round((done / total) * 100, 1)

    # Check overall completion
    all_done = all(
        s["status"] in ("completed", "skipped")
        for s in workflow["steps"]
    )
    any_failed = any(
        s["status"] == "failed" and s["blocking"]
        for s in workflow["steps"]
    )

    if any_failed:
        workflow["status"] = WorkflowStatus.FAILED.value
    elif all_done:
        workflow["status"] = WorkflowStatus.COMPLETED.value
        workflow["completed_at"] = now.isoformat() + "Z"

    workflow["audit_hash"] = _hash_workflow(
        workflow["workflow_id"], now.isoformat()
    )

    return workflow


def get_workflow_summary(workflow: dict) -> dict:
    """Get a concise summary of workflow status."""
    steps_by_status = {}
    for s in workflow["steps"]:
        status = s["status"]
        steps_by_status.setdefault(status, [])
        steps_by_status[status].append(s["id"])

    missing_evidence = []
    for s in workflow["steps"]:
        if s["status"] in ("pending", "in_progress"):
            missing = [e for e in s["required_evidence"] if e not in s["provided_evidence"]]
            if missing:
                missing_evidence.append({"step": s["id"], "missing": missing})

    next_steps = []
    for s in workflow["steps"]:
        if s["status"] == "pending":
            can_start = all(
                prev["status"] in ("completed", "skipped")
                for prev in workflow["steps"]
                if prev["order"] < s["order"] and prev["blocking"]
            )
            if can_start:
                next_steps.append(s["id"])

    return {
        "workflow_id": workflow["workflow_id"],
        "name": workflow["name"],
        "status": workflow["status"],
        "progress": workflow["progress"],
        "entity_id": workflow["entity_id"],
        "jurisdiction": workflow["jurisdiction"],
        "priority": workflow["priority"],
        "steps_by_status": steps_by_status,
        "next_actionable_steps": next_steps,
        "missing_evidence": missing_evidence,
        "deadline": workflow["deadline"],
        "is_overdue": datetime.utcnow().isoformat() > workflow["deadline"],
    }


def list_templates() -> list[dict]:
    """List available workflow templates."""
    return [
        {
            "id": tid,
            "name": t["name"],
            "description": t["description"],
            "steps_count": len(t["steps"]),
            "jurisdiction_aware": t["jurisdiction_aware"],
        }
        for tid, t in TEMPLATES.items()
    ]


def _hash_workflow(workflow_id: str, timestamp: str) -> str:
    data = f"{workflow_id}:{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()[:32]
