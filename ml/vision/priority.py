"""
ml/vision/priority.py
---------------------
Stage J & Section 20-21: Exposure Analysis & Response Priority Engine.
Fuses Environmental Risk, Observed Impact, Exposure, and Credibility into an
explainable response priority score (0-100) while keeping all 7 component scores distinct.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any


@dataclass
class ExposureResult:
    exposure_score: float  # 0.0 - 100.0
    exposure_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    distance_to_road_m: float
    distance_to_village_m: float
    distance_to_critical_asset_m: float
    affected_infrastructure: List[str] = field(default_factory=list)


@dataclass
class ResponsePriorityResult:
    response_priority_score: float  # 0.0 - 100.0
    priority_level: str  # "CRITICAL", "HIGH", "ELEVATED", "GUARDED", "LOW"
    recommended_action: str  # "DISPATCH_AND_WARN", "AUTHORITY_VERIFY", "MONITOR", "QUARANTINE", "ARCHIVE"
    environmental_risk_score: float  # 0.0 - 100.0
    image_confidence_score: float  # 0.0 - 100.0
    report_credibility_score: float  # 0.0 - 100.0
    coordination_risk_score: float  # 0.0 - 100.0
    observed_impact_score: float  # 0.0 - 100.0
    exposure_score: float  # 0.0 - 100.0
    corroboration_count: int
    is_quarantined: bool
    explanation: Dict[str, Any] = field(default_factory=dict)
    decision_path: List[str] = field(default_factory=list)


def calculate_exposure(
    distance_to_road_m: float = 500.0,
    distance_to_village_m: float = 2000.0,
    distance_to_critical_asset_m: float = 5000.0,
) -> ExposureResult:
    """
    Computes GIS Exposure score based on proximity to roads, villages, and critical assets.
    """
    affected_infra: List[str] = []

    # Road proximity (high risk if within 100m)
    if distance_to_road_m <= 50.0:
        road_score = 100.0
        affected_infra.append(f"Direct road corridor intersection ({distance_to_road_m:.0f}m)")
    elif distance_to_road_m <= 200.0:
        road_score = 80.0
        affected_infra.append(f"Major road corridor in immediate buffer ({distance_to_road_m:.0f}m)")
    elif distance_to_road_m <= 1000.0:
        road_score = 45.0
    else:
        road_score = 15.0

    # Village / settlement proximity
    if distance_to_village_m <= 300.0:
        village_score = 100.0
        affected_infra.append(f"Human settlement / village within {distance_to_village_m:.0f}m")
    elif distance_to_village_m <= 1500.0:
        village_score = 75.0
        affected_infra.append(f"Settlement within {distance_to_village_m:.0f}m buffer")
    elif distance_to_village_m <= 3000.0:
        village_score = 40.0
    else:
        village_score = 10.0

    # Critical assets (hospitals, power stations, bridges)
    if distance_to_critical_asset_m <= 500.0:
        asset_score = 100.0
        affected_infra.append("Critical lifeline asset within 500m")
    elif distance_to_critical_asset_m <= 2000.0:
        asset_score = 65.0
    else:
        asset_score = 20.0

    # Weighted synthesis
    raw_exp = (road_score * 0.45) + (village_score * 0.35) + (asset_score * 0.20)
    exposure_score = round(max(0.0, min(100.0, raw_exp)), 1)

    if exposure_score >= 80.0:
        level = "CRITICAL"
    elif exposure_score >= 55.0:
        level = "HIGH"
    elif exposure_score >= 30.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    return ExposureResult(
        exposure_score=exposure_score,
        exposure_level=level,
        distance_to_road_m=distance_to_road_m,
        distance_to_village_m=distance_to_village_m,
        distance_to_critical_asset_m=distance_to_critical_asset_m,
        affected_infrastructure=affected_infra,
    )


def calculate_response_priority(
    environmental_risk: float,       # 0 - 100
    image_confidence: float,         # 0 - 100
    report_credibility: float,       # 0 - 100
    coordination_risk: float,        # 0 - 100
    observed_impact: float,          # 0 - 100
    exposure: float,                 # 0 - 100
    corroboration_count: int = 1,
) -> ResponsePriorityResult:
    """
    Fuses environmental and observational signals into an explainable response priority score.
    Strictly adheres to Section 20 Gating Rules.
    """
    decision_path: List[str] = []

    # Rule 1: High coordination risk triggers immediate quarantine
    if coordination_risk >= 70.0:
        decision_path.append(f"Gating: High coordination risk ({coordination_risk:.1f}/100) -> Quarantine active.")
        return ResponsePriorityResult(
            response_priority_score=15.0,
            priority_level="LOW",
            recommended_action="QUARANTINE",
            environmental_risk_score=environmental_risk,
            image_confidence_score=image_confidence,
            report_credibility_score=report_credibility,
            coordination_risk_score=coordination_risk,
            observed_impact_score=observed_impact,
            exposure_score=exposure,
            corroboration_count=corroboration_count,
            is_quarantined=True,
            explanation={"status": "Quarantined due to suspected coordinated reporting attack."},
            decision_path=decision_path,
        )

    # Rule 2: Low credibility modulates/dampens citizen visual evidence contribution
    if report_credibility < 40.0:
        evidence_weight = 0.15
        decision_path.append(f"Damping: Low credibility ({report_credibility:.1f}/100) reduced visual evidence weight to 15%.")
    elif report_credibility < 70.0:
        evidence_weight = 0.50
        decision_path.append(f"Damping: Moderate credibility ({report_credibility:.1f}/100) scaled evidence weight to 50%.")
    else:
        evidence_weight = 1.0
        decision_path.append(f"Verified: High credibility ({report_credibility:.1f}/100) allows full evidence weighting.")

    # Modulated observational evidence score
    effective_visual_impact = (observed_impact * 0.6 + image_confidence * 0.4) * evidence_weight

    # Base weighted synthesis
    # Environmental Risk: 35%, Effective Visual Impact: 30%, GIS Exposure: 25%, Credibility: 10%
    base_priority = (
        (environmental_risk * 0.35) +
        (effective_visual_impact * 0.30) +
        (exposure * 0.25) +
        (report_credibility * 0.10)
    )

    # Corroboration boost for independent multi-witness reports (up to +15 points)
    if corroboration_count >= 3 and report_credibility >= 60.0:
        corrob_boost = min(15.0, (corroboration_count - 1) * 4.0)
        base_priority = min(100.0, base_priority + corrob_boost)
        decision_path.append(f"Boost: Independent corroboration (+{corrob_boost:.1f} pts from {corroboration_count} reports).")

    final_priority = round(max(0.0, min(100.0, base_priority)), 1)

    # Priority Tier and Action determination
    if final_priority >= 80.0:
        level = "CRITICAL"
        action = "DISPATCH_AND_WARN"
    elif final_priority >= 65.0:
        level = "HIGH"
        action = "AUTHORITY_VERIFY"
    elif final_priority >= 45.0:
        level = "ELEVATED"
        action = "AUTHORITY_VERIFY"
    elif final_priority >= 25.0:
        level = "GUARDED"
        action = "MONITOR"
    else:
        level = "LOW"
        action = "ARCHIVE"

    explanation = {
        "environmental_risk_contribution": round(environmental_risk * 0.35, 1),
        "observational_impact_contribution": round(effective_visual_impact * 0.30, 1),
        "exposure_contribution": round(exposure * 0.25, 1),
        "credibility_contribution": round(report_credibility * 0.10, 1),
        "evidence_weight_factor": evidence_weight,
    }

    return ResponsePriorityResult(
        response_priority_score=final_priority,
        priority_level=level,
        recommended_action=action,
        environmental_risk_score=environmental_risk,
        image_confidence_score=image_confidence,
        report_credibility_score=report_credibility,
        coordination_risk_score=coordination_risk,
        observed_impact_score=observed_impact,
        exposure_score=exposure,
        corroboration_count=corroboration_count,
        is_quarantined=False,
        explanation=explanation,
        decision_path=decision_path,
    )
