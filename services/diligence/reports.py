"""
AION Reporting Engine — generate due diligence reports.

Produces structured reports for:
- Risk assessment summaries
- Compliance audit results
- Workflow completion status
- Trend analysis over time
- Executive dashboards data

Reports are jurisdiction-aware and include
regulatory references for ES, PT, FI, EU.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any


REGULATORY_REFERENCES = {
    "ES": {
        "labor_law": "Estatuto de los Trabajadores (Real Decreto Legislativo 2/2015)",
        "working_time": "Art. 34-38 ET — Jornada, descansos, horas extraordinarias",
        "night_work": "Art. 36 ET — Trabajo nocturno",
        "weekly_rest": "Art. 37 ET — Descanso semanal mínimo de día y medio",
        "data_protection": "LOPDGDD (Ley Orgánica 3/2018)",
        "prevention": "Ley 31/1995 de Prevención de Riesgos Laborales",
    },
    "PT": {
        "labor_law": "Código do Trabalho (Lei n.º 7/2009)",
        "working_time": "Art. 203-214 CT — Duração e organização do tempo de trabalho",
        "night_work": "Art. 223-225 CT — Trabalho noturno",
        "weekly_rest": "Art. 232 CT — Descanso semanal obrigatório",
        "data_protection": "Lei n.º 58/2019 (RGPD nacional)",
        "prevention": "Lei n.º 102/2009 — Regime de promoção da SST",
    },
    "FI": {
        "labor_law": "Työaikalaki (Working Hours Act 872/2019)",
        "working_time": "§ 5-8 — Säännöllinen työaika",
        "night_work": "§ 26-27 — Yötyö",
        "weekly_rest": "§ 28 — Viikkolepo (min 35h continuous)",
        "data_protection": "Tietosuojalaki (1050/2018)",
        "prevention": "Työturvallisuuslaki (738/2002)",
    },
    "EU": {
        "labor_law": "Directive 2003/88/EC (Working Time Directive)",
        "working_time": "Art. 3-6 — Rest periods, maximum weekly working time",
        "night_work": "Art. 8-13 — Night work and shift work",
        "weekly_rest": "Art. 5 — Minimum 24h uninterrupted rest per 7-day period",
        "data_protection": "GDPR (Regulation 2016/679)",
        "csddd": "Directive 2024/1760 — Corporate Sustainability Due Diligence",
    },
}


def generate_risk_report(
    risk_assessment: dict,
    jurisdiction: str = "ES",
    period: str = "",
    tenant_name: str = "",
) -> dict:
    """Generate a structured risk assessment report."""
    refs = REGULATORY_REFERENCES.get(jurisdiction, REGULATORY_REFERENCES["EU"])
    factors = risk_assessment.get("factors", [])

    by_category = defaultdict(list)
    for f in factors:
        by_category[f["category"]].append(f)

    severity_counts = defaultdict(int)
    for f in factors:
        severity_counts[f["severity"]] += 1

    mitigations = []
    for f in factors:
        if f.get("mitigation"):
            mitigations.append({
                "category": f["category"],
                "finding": f["description"],
                "action": f["mitigation"],
                "priority": "immediate" if f["severity"] in ("CRITICAL", "HIGH") else "scheduled",
            })

    return {
        "report_type": "risk_assessment",
        "title": f"Risk Assessment Report — {tenant_name or risk_assessment.get('entity_id', 'Unknown')}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "period": period or "current",
        "jurisdiction": jurisdiction,
        "regulatory_framework": refs,
        "summary": {
            "overall_score": risk_assessment.get("overall_score", 0),
            "severity": risk_assessment.get("severity", "LOW"),
            "total_findings": len(factors),
            "severity_breakdown": dict(severity_counts),
            "categories_assessed": list(by_category.keys()),
        },
        "findings_by_category": {
            cat: [
                {
                    "description": f["description"],
                    "severity": f["severity"],
                    "score": f["score"],
                    "evidence": f.get("evidence", {}),
                }
                for f in items
            ]
            for cat, items in by_category.items()
        },
        "corrective_actions": mitigations,
        "compliance_status": "compliant" if risk_assessment.get("overall_score", 0) < 35 else "non_compliant",
    }


def generate_compliance_report(
    violations: list[dict],
    schedules_checked: int,
    employees_checked: int,
    jurisdiction: str = "ES",
    period: str = "",
    tenant_name: str = "",
) -> dict:
    """Generate a compliance audit report."""
    refs = REGULATORY_REFERENCES.get(jurisdiction, REGULATORY_REFERENCES["EU"])

    by_type = defaultdict(list)
    by_severity = defaultdict(int)
    for v in violations:
        by_type[v.get("type", "unknown")].append(v)
        by_severity[v.get("severity", "medium")] += 1

    compliance_rate = 1.0 - (len(violations) / max(schedules_checked, 1))

    return {
        "report_type": "compliance_audit",
        "title": f"Labor Compliance Audit — {tenant_name or 'Organization'}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "period": period or "current",
        "jurisdiction": jurisdiction,
        "regulatory_framework": refs,
        "scope": {
            "schedules_checked": schedules_checked,
            "employees_checked": employees_checked,
            "violation_count": len(violations),
        },
        "compliance_rate": round(compliance_rate * 100, 1),
        "status": "PASS" if compliance_rate >= 0.95 else "FAIL",
        "violations_by_type": {
            vtype: {
                "count": len(items),
                "severity_max": max((v.get("severity", "medium") for v in items), default="medium"),
                "details": items[:5],
            }
            for vtype, items in by_type.items()
        },
        "violations_by_severity": dict(by_severity),
        "recommendations": _compliance_recommendations(by_type, jurisdiction),
    }


def generate_workflow_report(
    workflows: list[dict],
    tenant_name: str = "",
) -> dict:
    """Generate a due diligence workflow status report."""
    by_status = defaultdict(int)
    by_template = defaultdict(list)
    overdue = []

    now = datetime.utcnow().isoformat()

    for w in workflows:
        by_status[w.get("status", "unknown")] += 1
        by_template[w.get("template_id", "unknown")].append(w)
        if w.get("deadline", "") < now and w.get("status") not in ("completed", "failed"):
            overdue.append({
                "workflow_id": w["workflow_id"],
                "name": w["name"],
                "entity_id": w.get("entity_id", ""),
                "deadline": w["deadline"],
                "progress": w.get("progress", 0),
            })

    avg_progress = (
        sum(w.get("progress", 0) for w in workflows) / len(workflows)
        if workflows else 0
    )

    return {
        "report_type": "workflow_status",
        "title": f"Due Diligence Workflow Report — {tenant_name or 'Organization'}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total_workflows": len(workflows),
            "by_status": dict(by_status),
            "average_progress": round(avg_progress, 1),
            "overdue_count": len(overdue),
        },
        "by_template": {
            tid: {
                "count": len(items),
                "completed": sum(1 for w in items if w.get("status") == "completed"),
                "active": sum(1 for w in items if w.get("status") == "active"),
            }
            for tid, items in by_template.items()
        },
        "overdue_workflows": overdue,
        "health": "healthy" if not overdue else "attention_needed",
    }


def generate_trend_report(
    historical_scores: list[dict],
    jurisdiction: str = "ES",
    tenant_name: str = "",
) -> dict:
    """
    Generate a risk trend report over time.

    historical_scores: [{"date": "2026-01", "score": 45, "violations": 3}, ...]
    """
    if len(historical_scores) < 2:
        trend = "insufficient_data"
        direction = 0
    else:
        scores = [h["score"] for h in historical_scores]
        recent = sum(scores[-3:]) / min(3, len(scores[-3:]))
        older = sum(scores[:3]) / min(3, len(scores[:3]))
        direction = recent - older
        if direction > 5:
            trend = "worsening"
        elif direction < -5:
            trend = "improving"
        else:
            trend = "stable"

    return {
        "report_type": "trend_analysis",
        "title": f"Risk Trend Analysis — {tenant_name or 'Organization'}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "jurisdiction": jurisdiction,
        "data_points": len(historical_scores),
        "trend": trend,
        "direction": round(direction, 1),
        "history": historical_scores,
        "current_score": historical_scores[-1]["score"] if historical_scores else None,
        "recommendation": _trend_recommendation(trend),
    }


def _compliance_recommendations(by_type: dict, jurisdiction: str) -> list[str]:
    recs = []
    refs = REGULATORY_REFERENCES.get(jurisdiction, {})

    if "max_daily_hours" in by_type:
        recs.append(f"Review daily hour limits per {refs.get('working_time', 'applicable regulation')}.")
    if "min_daily_rest" in by_type:
        recs.append(f"Ensure rest periods comply with {refs.get('working_time', 'applicable regulation')}.")
    if "night_work" in by_type:
        recs.append(f"Review night work assignments per {refs.get('night_work', 'applicable regulation')}.")
    if "weekly_rest" in by_type:
        recs.append(f"Verify weekly rest per {refs.get('weekly_rest', 'applicable regulation')}.")
    if not recs:
        recs.append("No specific recommendations. Continue monitoring.")
    return recs


def _trend_recommendation(trend: str) -> str:
    if trend == "worsening":
        return "Risk is increasing. Initiate incident investigation workflow and review corrective actions."
    if trend == "improving":
        return "Positive trend. Continue current compliance practices and monitor."
    if trend == "stable":
        return "Risk is stable. Focus on proactive improvements and document reviews."
    return "Insufficient data for trend analysis. Collect more assessment data points."
