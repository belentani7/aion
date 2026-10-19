"""
AION Risk Engine — compliance risk scoring across entities.

Evaluates risk based on:
- Labor compliance violations (from compliance engine)
- Schedule fairness gaps (from scheduling engine)
- Audit trail anomalies (gaps, hash breaks)
- Document expiration (contracts, certifications)
- Jurisdictional exposure (multi-country operations)
- Historical incident patterns

Outputs risk scores per entity (tenant, department, employee)
with severity classification (LOW/MEDIUM/HIGH/CRITICAL) and
recommended mitigation actions.
"""

from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class RiskFactor:
    category: str
    description: str
    severity: Severity
    score: float  # 0-100
    evidence: dict[str, Any] = field(default_factory=dict)
    mitigation: str = ""


@dataclass
class RiskProfile:
    entity_id: str
    entity_type: str  # tenant | department | employee
    overall_score: float
    severity: Severity
    factors: list[RiskFactor]
    assessed_at: str


def _severity_from_score(score: float) -> Severity:
    if score >= 80:
        return Severity.CRITICAL
    if score >= 60:
        return Severity.HIGH
    if score >= 35:
        return Severity.MEDIUM
    return Severity.LOW


def assess_labor_compliance(violations: list[dict]) -> list[RiskFactor]:
    """Score risk from compliance violations."""
    if not violations:
        return []

    factors = []
    severity_weights = {"critical": 25, "high": 15, "medium": 8, "low": 3}

    by_type: dict[str, list] = defaultdict(list)
    for v in violations:
        by_type[v.get("type", "unknown")].append(v)

    for vtype, items in by_type.items():
        max_sev = max(
            (severity_weights.get(i.get("severity", "medium"), 8) for i in items),
            default=8,
        )
        count = len(items)
        score = min(100, max_sev * math.log2(count + 1) * 2)

        factors.append(RiskFactor(
            category="labor_compliance",
            description=f"{count} {vtype} violation(s) detected",
            severity=_severity_from_score(score),
            score=round(score, 1),
            evidence={"violation_type": vtype, "count": count, "sample": items[:3]},
            mitigation=_compliance_mitigation(vtype),
        ))

    return factors


def assess_schedule_fairness(fairness_data: dict) -> list[RiskFactor]:
    """Score risk from unfair shift distribution."""
    if not fairness_data:
        return []

    factors = []
    gini = fairness_data.get("gini", 0)
    max_gap = fairness_data.get("max_gap", 0)
    fairness_score = fairness_data.get("score", 100)

    if gini > 0.3:
        score = min(100, gini * 150)
        factors.append(RiskFactor(
            category="schedule_equity",
            description=f"Shift distribution inequality (Gini={gini:.2f})",
            severity=_severity_from_score(score),
            score=round(score, 1),
            evidence={"gini": gini, "max_gap": max_gap, "fairness_score": fairness_score},
            mitigation="Rebalance shift assignments. Use roster optimizer with fairness constraints.",
        ))

    if max_gap > 5:
        score = min(100, max_gap * 8)
        factors.append(RiskFactor(
            category="schedule_equity",
            description=f"Max shift gap between employees: {max_gap}",
            severity=_severity_from_score(score),
            score=round(score, 1),
            evidence={"max_gap": max_gap},
            mitigation="Cap individual shift counts. Review employee availability constraints.",
        ))

    return factors


def assess_audit_integrity(audit_entries: list[dict]) -> list[RiskFactor]:
    """Score risk from audit trail anomalies."""
    if not audit_entries:
        return [RiskFactor(
            category="audit_integrity",
            description="No audit trail entries found",
            severity=Severity.HIGH,
            score=70,
            mitigation="Enable audit logging for all schedule and compliance operations.",
        )]

    factors = []

    # Check for hash chain breaks
    for i in range(1, len(audit_entries)):
        prev_hash = audit_entries[i].get("prev_hash", "")
        expected = audit_entries[i - 1].get("hash", "")
        if prev_hash and expected and prev_hash != expected:
            factors.append(RiskFactor(
                category="audit_integrity",
                description="Hash chain break detected in audit trail",
                severity=Severity.CRITICAL,
                score=95,
                evidence={"position": i, "expected": expected[:16], "found": prev_hash[:16]},
                mitigation="Investigate tampering. Restore from backup and re-verify chain.",
            ))
            break

    # Check for time gaps > 24h
    for i in range(1, len(audit_entries)):
        t1 = audit_entries[i - 1].get("timestamp", "")
        t2 = audit_entries[i].get("timestamp", "")
        if t1 and t2:
            try:
                dt1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
                dt2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
                gap = abs((dt2 - dt1).total_seconds())
                if gap > 86400:
                    factors.append(RiskFactor(
                        category="audit_integrity",
                        description=f"Audit gap of {gap / 3600:.0f}h between entries",
                        severity=Severity.MEDIUM,
                        score=40,
                        evidence={"gap_hours": round(gap / 3600, 1), "position": i},
                        mitigation="Verify system uptime during gap. Check for suppressed events.",
                    ))
            except (ValueError, TypeError):
                pass

    return factors


def assess_document_expiry(documents: list[dict]) -> list[RiskFactor]:
    """Score risk from expired or expiring documents."""
    if not documents:
        return []

    factors = []
    now = datetime.utcnow()

    expired = []
    expiring_soon = []

    for doc in documents:
        exp_date_str = doc.get("expires_at", "")
        if not exp_date_str:
            continue
        try:
            exp_date = datetime.fromisoformat(exp_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
            if exp_date < now:
                expired.append(doc)
            elif exp_date < now + timedelta(days=30):
                expiring_soon.append(doc)
        except (ValueError, TypeError):
            pass

    if expired:
        score = min(100, len(expired) * 20)
        factors.append(RiskFactor(
            category="document_compliance",
            description=f"{len(expired)} document(s) expired",
            severity=_severity_from_score(score),
            score=round(score, 1),
            evidence={"expired_count": len(expired), "documents": [d.get("name", "") for d in expired[:5]]},
            mitigation="Renew expired documents immediately. Block affected operations until renewed.",
        ))

    if expiring_soon:
        score = min(60, len(expiring_soon) * 10)
        factors.append(RiskFactor(
            category="document_compliance",
            description=f"{len(expiring_soon)} document(s) expiring within 30 days",
            severity=Severity.MEDIUM,
            score=round(score, 1),
            evidence={"expiring_count": len(expiring_soon), "documents": [d.get("name", "") for d in expiring_soon[:5]]},
            mitigation="Schedule document renewals. Notify responsible parties.",
        ))

    return factors


def assess_jurisdictional_exposure(jurisdictions: list[str]) -> list[RiskFactor]:
    """Score risk from multi-jurisdiction operations."""
    if len(jurisdictions) <= 1:
        return []

    complexity_map = {
        "ES": 1.2, "PT": 1.0, "FI": 1.1, "EU": 1.0,
        "FR": 1.4, "DE": 1.3, "IT": 1.3, "UK": 1.2,
    }

    complexity = sum(complexity_map.get(j, 1.5) for j in jurisdictions)
    score = min(80, complexity * 10)

    return [RiskFactor(
        category="jurisdictional_complexity",
        description=f"Operating across {len(jurisdictions)} jurisdictions",
        severity=_severity_from_score(score),
        score=round(score, 1),
        evidence={"jurisdictions": jurisdictions, "complexity_index": round(complexity, 2)},
        mitigation="Ensure compliance engine covers all active jurisdictions. Assign jurisdiction-specific compliance officers.",
    )]


def full_risk_assessment(
    entity_id: str,
    entity_type: str = "tenant",
    violations: list[dict] | None = None,
    fairness_data: dict | None = None,
    audit_entries: list[dict] | None = None,
    documents: list[dict] | None = None,
    jurisdictions: list[str] | None = None,
) -> dict:
    """
    Run full risk assessment for an entity.

    Returns serializable dict with overall score, severity, and detailed factors.
    """
    all_factors: list[RiskFactor] = []

    all_factors.extend(assess_labor_compliance(violations or []))
    all_factors.extend(assess_schedule_fairness(fairness_data or {}))
    all_factors.extend(assess_audit_integrity(audit_entries or []))
    all_factors.extend(assess_document_expiry(documents or []))
    all_factors.extend(assess_jurisdictional_exposure(jurisdictions or []))

    if all_factors:
        weights = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        weighted_sum = sum(f.score * weights.get(f.severity.value, 1) for f in all_factors)
        total_weight = sum(weights.get(f.severity.value, 1) for f in all_factors)
        overall = weighted_sum / total_weight if total_weight else 0
    else:
        overall = 0

    severity = _severity_from_score(overall)

    return {
        "entity_id": entity_id,
        "entity_type": entity_type,
        "overall_score": round(overall, 1),
        "severity": severity.value,
        "factor_count": len(all_factors),
        "factors": [
            {
                "category": f.category,
                "description": f.description,
                "severity": f.severity.value,
                "score": f.score,
                "evidence": f.evidence,
                "mitigation": f.mitigation,
            }
            for f in sorted(all_factors, key=lambda x: x.score, reverse=True)
        ],
        "assessed_at": datetime.utcnow().isoformat() + "Z",
    }


def _compliance_mitigation(violation_type: str) -> str:
    mitigations = {
        "max_daily_hours": "Reduce shift length or split into multiple shorter shifts.",
        "min_daily_rest": "Ensure minimum rest gap between consecutive shifts.",
        "max_weekly_hours": "Redistribute hours across more employees.",
        "night_work": "Limit night shift assignments. Provide compensatory rest.",
        "weekly_rest": "Guarantee minimum weekly rest days per jurisdiction.",
        "overtime": "Review overtime policy. Consider hiring additional staff.",
    }
    return mitigations.get(violation_type, "Review and correct the violation. Consult legal counsel if needed.")
