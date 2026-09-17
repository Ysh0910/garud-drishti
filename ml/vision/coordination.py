"""
ml/vision/coordination.py
-------------------------
Stage H & Section 14-16: Coordinated Fraud Detection Engine.
Detects coordinated fake-report campaigns, synchronized bursts, image reuse across
different citizen accounts, and spatial anomalies.
Flags events/clusters for QUARANTINE rather than individual users.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Any
import numpy as np

from ml.vision.authenticity import hamming_distance


@dataclass
class ReportClusterItem:
    report_id: str
    user_id: str
    latitude: float
    longitude: float
    submitted_at: datetime
    phash: str
    image_quality_score: float
    landslide_confidence: float
    environmental_risk: float
    description: Optional[str] = None


@dataclass
class CoordinationAnalysisResult:
    cluster_id: str
    cluster_size: int
    coordination_risk_score: float  # 0.0 - 100.0 (High score indicates suspicious coordinated campaign)
    is_quarantine_recommended: bool
    burst_score: float  # 0.0 - 100.0
    visual_similarity_score: float  # 0.0 - 100.0
    spatial_cluster_score: float  # 0.0 - 100.0
    independent_corroboration_score: float  # 0.0 - 100.0 (Genuine diverse corroboration)
    verdict: str  # "LEGITIMATE_CORROBORATION", "NORMAL_SPARSE", "SUSPICIOUS_COORDINATION", "QUARANTINE"
    model_version: str
    reasons: List[str] = field(default_factory=list)


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in metres between two GPS coordinates."""
    r = 6371000.0  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class CoordinatedFraudDetector:
    """
    Evaluates groups of recent hazard reports in a spatio-temporal window
    to distinguish genuine multi-witness corroboration from coordinated bot/fraud attacks.
    """

    def __init__(self, model_version: str = "1.0.0"):
        self.model_version = model_version

    def analyze_cluster(
        self,
        cluster_id: str,
        reports: List[ReportClusterItem],
        max_time_span_minutes: float = 30.0,
        max_distance_m: float = 2000.0,
    ) -> CoordinationAnalysisResult:
        """
        Analyzes a cluster of reports for coordinated fraud patterns.
        """
        n = len(reports)
        if n <= 1:
            return CoordinationAnalysisResult(
                cluster_id=cluster_id,
                cluster_size=n,
                coordination_risk_score=5.0,
                is_quarantine_recommended=False,
                burst_score=0.0,
                visual_similarity_score=0.0,
                spatial_cluster_score=0.0,
                independent_corroboration_score=50.0,
                verdict="NORMAL_SPARSE",
                model_version=self.model_version,
                reasons=["Single isolated report; no multi-account cluster observed."],
            )

        reasons: List[str] = []

        # 1. Temporal burst analysis
        timestamps = [
            r.submitted_at.replace(tzinfo=timezone.utc) if r.submitted_at.tzinfo is None else r.submitted_at
            for r in reports
        ]
        min_time = min(timestamps)
        max_time = max(timestamps)
        duration_sec = max(1.0, (max_time - min_time).total_seconds())
        duration_min = duration_sec / 60.0

        # Burst rate (reports per minute)
        rate = n / max(1.0, duration_min)
        if rate >= 5.0 and n >= 4:
            burst_score = min(100.0, rate * 12.0)
            reasons.append(f"High-frequency submission burst ({n} reports in {duration_min:.1f} mins).")
        elif rate >= 2.0:
            burst_score = min(60.0, rate * 10.0)
        else:
            burst_score = 15.0

        # 2. Visual similarity & image reuse across accounts
        unique_users = set(r.user_id for r in reports)
        pairwise_dists: List[int] = []
        identical_images_count = 0

        for i in range(n):
            for j in range(i + 1, n):
                d = hamming_distance(reports[i].phash, reports[j].phash)
                pairwise_dists.append(d)
                if d <= 6:  # Near identical
                    identical_images_count += 1

        total_pairs = len(pairwise_dists)
        identical_pair_ratio = identical_images_count / max(1, total_pairs)

        if identical_pair_ratio > 0.40 and len(unique_users) > 1:
            visual_sim_score = min(100.0, identical_pair_ratio * 120.0)
            reasons.append(f"Same/near-identical photo reused across {len(unique_users)} separate accounts.")
        else:
            visual_sim_score = identical_pair_ratio * 50.0

        # 3. Spatial concentration
        distances = []
        for i in range(n):
            for j in range(i + 1, n):
                dist_m = haversine_distance_m(
                    reports[i].latitude, reports[i].longitude,
                    reports[j].latitude, reports[j].longitude,
                )
                distances.append(dist_m)
        mean_dist = float(np.mean(distances)) if distances else 0.0
        spatial_cluster_score = min(100.0, max(0.0, 100.0 - (mean_dist / 20.0)))

        # 4. Environmental context check
        avg_env_risk = float(np.mean([r.environmental_risk for r in reports]))
        avg_cv_conf = float(np.mean([r.landslide_confidence for r in reports]))

        # Synthesize Coordination Risk (0-100)
        # High burst + identical images across accounts + low environmental risk = COORDINATED ATTACK
        coord_calc = (
            (visual_sim_score * 0.45) +
            (burst_score * 0.35) +
            (spatial_cluster_score * 0.20)
        )

        if avg_env_risk < 25.0 and visual_sim_score > 60.0:
            coord_calc = min(100.0, coord_calc + 25.0)
            reasons.append(f"Reports concentrated in low environmental risk zone ({avg_env_risk:.1f}/100).")

        coord_risk_score = round(max(0.0, min(100.0, coord_calc)), 1)

        # Independent Corroboration Score (0-100)
        # Different photos (low visual_sim) + diverse locations (<2km) + high CV + high env risk
        if visual_sim_score < 25.0 and avg_cv_conf >= 0.65 and avg_env_risk >= 40.0:
            corrob_score = min(100.0, 40.0 + (len(unique_users) * 15.0) + (avg_env_risk * 0.3))
            reasons.append(f"Independent convergence confirmed across {len(unique_users)} distinct photographers.")
        else:
            corrob_score = max(0.0, 50.0 - (coord_risk_score * 0.5))

        # Quarantine decision
        if coord_risk_score >= 70.0 or (visual_sim_score >= 80.0 and len(unique_users) >= 3):
            is_quarantine = True
            verdict = "QUARANTINE"
            reasons.append("Cluster quarantined: High probability of coordinated fake-evidence campaign.")
        elif coord_risk_score >= 45.0:
            is_quarantine = False
            verdict = "SUSPICIOUS_COORDINATION"
        elif corrob_score >= 65.0:
            is_quarantine = False
            verdict = "LEGITIMATE_CORROBORATION"
        else:
            is_quarantine = False
            verdict = "NORMAL_SPARSE"

        return CoordinationAnalysisResult(
            cluster_id=cluster_id,
            cluster_size=n,
            coordination_risk_score=coord_risk_score,
            is_quarantine_recommended=is_quarantine,
            burst_score=round(burst_score, 1),
            visual_similarity_score=round(visual_sim_score, 1),
            spatial_cluster_score=round(spatial_cluster_score, 1),
            independent_corroboration_score=round(corrob_score, 1),
            verdict=verdict,
            model_version=self.model_version,
            reasons=reasons,
        )
