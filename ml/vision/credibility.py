"""
ml/vision/credibility.py
------------------------
Stage G: Individual Report Credibility Engine.
Synthesizes structured signals across vision, authenticity, GPS, time,
and environmental risk into an auditable credibility score (0-100).
Adheres strictly to Explainability and Auditing rules (Section 32).
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from ml.vision.quality import ImageQualityResult
from ml.vision.authenticity import ImageReuseResult
from ml.vision.classifier import LandslideClassificationResult
from ml.vision.segmentation import SegmentationResult
from ml.vision.consistency import GPSConsistencyResult, TemporalConsistencyResult


@dataclass
class CredibilityResult:
    credibility_score: float  # 0.0 - 100.0
    credibility_tier: str  # "HIGH", "MODERATE", "LOW", "SUSPICIOUS"
    is_credible: bool
    model_version: str
    component_scores: Dict[str, float] = field(default_factory=dict)
    positive_signals: List[str] = field(default_factory=list)
    risk_flags: List[str] = field(default_factory=list)
    audit_summary: str = ""


def calculate_report_credibility(
    quality: ImageQualityResult,
    reuse: ImageReuseResult,
    classifier: LandslideClassificationResult,
    segmenter: SegmentationResult,
    gps: GPSConsistencyResult,
    temporal: TemporalConsistencyResult,
    environmental_risk_score: float,  # Dynamic XGBoost risk 0-100
    model_version: str = "1.0.0",
) -> CredibilityResult:
    """
    Computes explainable individual report credibility score.
    """
    positive_signals: List[str] = []
    risk_flags: List[str] = []

    # 1. Image Quality (Weight: 15%)
    q_score = quality.image_quality_score
    if quality.status == "ACCEPT":
        positive_signals.append(f"Image quality verified (score {q_score:.1f}/100).")
    elif quality.status == "LOW_QUALITY":
        risk_flags.append(f"Low quality image payload: {', '.join(quality.issues[:2])}.")
    else:
        risk_flags.append(f"Image quality gate rejected: {', '.join(quality.issues)}.")

    # 2. Authenticity & Reuse (Weight: 25%)
    r_score = reuse.image_reuse_score
    if reuse.verdict == "UNIQUE":
        positive_signals.append("Image is unique and not found in duplicate hash database.")
    elif reuse.verdict == "NEAR_DUPLICATE":
        risk_flags.append(f"Potential image reuse detected (Hamming distance {reuse.min_hamming_distance}).")
    else:
        risk_flags.append("Exact duplicate of an existing submission detected.")

    # 3. Landslide CV Confidence (Weight: 25%)
    cv_score = classifier.confidence * 100.0 if classifier.is_landslide else max(0.0, (1.0 - classifier.confidence) * 40.0)
    if classifier.predicted_class == "LANDSLIDE" and classifier.confidence >= 0.70:
        positive_signals.append(f"Strong landslide CV confidence ({classifier.confidence*100.0:.1f}%).")
    elif classifier.predicted_class == "NON_LANDSLIDE":
        risk_flags.append(f"CV classifier detected non-landslide scene ({classifier.confidence*100.0:.1f}%).")
    else:
        risk_flags.append("CV classifier uncertain regarding landslide presence.")

    # 4. GPS & Terrain Consistency (Weight: 15%)
    g_score = gps.gps_consistency_score
    if gps.in_ner_bounds and gps.is_terrain_consistent:
        positive_signals.append("GPS coordinates consistent with susceptible NER terrain.")
    else:
        for w in gps.warnings:
            risk_flags.append(f"GPS anomaly: {w}")

    # 5. Temporal Consistency (Weight: 10%)
    t_score = temporal.temporal_consistency_score
    if temporal.is_plausible and temporal.delay_hours <= 12.0:
        positive_signals.append(f"Observation timestamp consistent ({temporal.delay_hours:.1f}h latency).")
    else:
        for w in temporal.warnings:
            risk_flags.append(f"Temporal flag: {w}")

    # 6. Environmental Alignment (Weight: 10%)
    # Checks alignment with existing XGBoost dynamic risk
    if environmental_risk_score >= 60.0:
        env_score = 95.0
        positive_signals.append(f"High environmental risk ({environmental_risk_score:.0f}/100) corroborates event.")
    elif environmental_risk_score >= 35.0:
        env_score = 75.0
    else:
        env_score = 45.0
        risk_flags.append(f"Environmental risk is currently LOW ({environmental_risk_score:.0f}/100) at this location.")

    # Weighted synthesis
    base_cred = (
        (q_score * 0.15) +
        (r_score * 0.25) +
        (cv_score * 0.25) +
        (g_score * 0.15) +
        (t_score * 0.10) +
        (env_score * 0.10)
    )

    # Severe penalty multipliers for duplicates or invalid images
    if reuse.verdict == "EXACT_DUPLICATE":
        base_cred = min(base_cred, 20.0)
    if not quality.is_valid:
        base_cred = min(base_cred, 15.0)

    final_credibility = round(max(0.0, min(100.0, base_cred)), 1)

    if final_credibility >= 75.0:
        tier = "HIGH"
        is_cred = True
    elif final_credibility >= 50.0:
        tier = "MODERATE"
        is_cred = True
    elif final_credibility >= 30.0:
        tier = "LOW"
        is_cred = False
    else:
        tier = "SUSPICIOUS"
        is_cred = False

    audit_summary = (
        f"Credibility Score: {final_credibility}/100 ({tier}). "
        f"Positives: {len(positive_signals)}, Flags: {len(risk_flags)}."
    )

    component_scores = {
        "image_quality": q_score,
        "authenticity_reuse": r_score,
        "cv_confidence": cv_score,
        "gps_consistency": g_score,
        "temporal_consistency": t_score,
        "environmental_consistency": env_score,
    }

    return CredibilityResult(
        credibility_score=final_credibility,
        credibility_tier=tier,
        is_credible=is_cred,
        model_version=model_version,
        component_scores=component_scores,
        positive_signals=positive_signals,
        risk_flags=risk_flags,
        audit_summary=audit_summary,
    )
