"""
tests/ml/test_credibility_and_coordination.py
---------------------------------------------
Unit tests for Individual Credibility, Response Priority, and Coordinated Fraud Cluster Detection.
"""

from datetime import datetime, timezone, timedelta
import pytest

from ml.vision.quality import ImageQualityResult
from ml.vision.authenticity import ImageReuseResult
from ml.vision.classifier import LandslideClassificationResult
from ml.vision.segmentation import SegmentationResult
from ml.vision.consistency import GPSConsistencyResult, TemporalConsistencyResult
from ml.vision.credibility import calculate_report_credibility
from ml.vision.priority import calculate_exposure, calculate_response_priority
from ml.vision.coordination import CoordinatedFraudDetector, ReportClusterItem


def test_individual_credibility_high_score():
    quality = ImageQualityResult(
        is_valid=True, status="ACCEPT", image_quality_score=90.0,
        width=800, height=600, aspect_ratio=1.33, mime_type="image/jpeg",
        file_size_bytes=200000, blur_score=150.0, brightness_score=130.0, contrast_score=35.0,
    )
    reuse = ImageReuseResult(
        is_duplicate=False, min_hamming_distance=45, matched_hash=None,
        image_reuse_score=95.0, verdict="UNIQUE", explanation="Unique image",
    )
    clf = LandslideClassificationResult(
        predicted_class="LANDSLIDE", confidence=0.88,
        class_probabilities={"LANDSLIDE": 0.88, "NON_LANDSLIDE": 0.12, "UNCERTAIN": 0.0},
        is_landslide=True, model_name="garud-mobilenetv3-landslide-v1", model_version="1.0.0",
    )
    seg = SegmentationResult(
        segmentation_confidence=0.85, visible_affected_fraction=0.18,
        mask_width=256, mask_height=256, bounding_box=(20, 30, 200, 210),
        model_name="garud-segformer-b0-landslide-v1", model_version="1.0.0",
    )
    gps = GPSConsistencyResult(
        gps_consistency_score=90.0, in_ner_bounds=True, is_terrain_consistent=True,
        nearest_hazard_zone="HIGH",
    )
    temporal = TemporalConsistencyResult(
        temporal_consistency_score=95.0, delay_hours=1.5, is_plausible=True, exif_match=True,
    )

    cred = calculate_report_credibility(
        quality=quality, reuse=reuse, classifier=clf, segmenter=seg,
        gps=gps, temporal=temporal, environmental_risk_score=80.0,
    )

    assert cred.credibility_score >= 80.0
    assert cred.credibility_tier == "HIGH"
    assert cred.is_credible is True
    assert len(cred.positive_signals) >= 4


def test_individual_credibility_duplicate_penalty():
    quality = ImageQualityResult(
        is_valid=True, status="ACCEPT", image_quality_score=85.0,
        width=640, height=480, aspect_ratio=1.33, mime_type="image/jpeg",
        file_size_bytes=150000, blur_score=100.0, brightness_score=120.0, contrast_score=30.0,
    )
    reuse_dup = ImageReuseResult(
        is_duplicate=True, min_hamming_distance=0, matched_hash="abcdef",
        image_reuse_score=5.0, verdict="EXACT_DUPLICATE", explanation="Duplicate",
    )
    clf = LandslideClassificationResult(
        predicted_class="LANDSLIDE", confidence=0.90,
        class_probabilities={"LANDSLIDE": 0.90, "NON_LANDSLIDE": 0.10, "UNCERTAIN": 0.0},
        is_landslide=True, model_name="garud-mobilenetv3-landslide-v1", model_version="1.0.0",
    )
    seg = SegmentationResult(
        segmentation_confidence=0.85, visible_affected_fraction=0.15,
        mask_width=256, mask_height=256, bounding_box=None,
        model_name="garud-segformer-b0-landslide-v1", model_version="1.0.0",
    )
    gps = GPSConsistencyResult(gps_consistency_score=85.0, in_ner_bounds=True, is_terrain_consistent=True, nearest_hazard_zone="HIGH")
    temporal = TemporalConsistencyResult(temporal_consistency_score=90.0, delay_hours=1.0, is_plausible=True, exif_match=None)

    cred = calculate_report_credibility(
        quality=quality, reuse=reuse_dup, classifier=clf, segmenter=seg,
        gps=gps, temporal=temporal, environmental_risk_score=75.0,
    )

    # Exact duplicate must be penalized severely
    assert cred.credibility_score <= 25.0
    assert cred.is_credible is False


def test_exposure_scoring():
    # Direct road hit (30m) & close village (200m)
    exp_crit = calculate_exposure(distance_to_road_m=30.0, distance_to_village_m=200.0, distance_to_critical_asset_m=400.0)
    assert exp_crit.exposure_score >= 80.0
    assert exp_crit.exposure_level == "CRITICAL"

    # Remote uninhabited mountain (road 3000m, village 5000m)
    exp_low = calculate_exposure(distance_to_road_m=3000.0, distance_to_village_m=5000.0, distance_to_critical_asset_m=10000.0)
    assert exp_low.exposure_score <= 30.0
    assert exp_low.exposure_level == "LOW"


def test_response_priority_gating_and_separation():
    # High risk, high impact, high credibility
    res = calculate_response_priority(
        environmental_risk=85.0,
        image_confidence=90.0,
        report_credibility=92.0,
        coordination_risk=5.0,
        observed_impact=88.0,
        exposure=80.0,
        corroboration_count=3,
    )

    assert res.response_priority_score >= 80.0
    assert res.priority_level == "CRITICAL"
    assert res.recommended_action == "DISPATCH_AND_WARN"
    assert res.is_quarantined is False
    assert res.environmental_risk_score == 85.0
    assert res.report_credibility_score == 92.0
    assert res.observed_impact_score == 88.0
    assert res.exposure_score == 80.0


def test_coordinated_fraud_detection_quarantine():
    detector = CoordinatedFraudDetector()
    now = datetime.now(timezone.utc)

    # 10 different accounts submitting the EXACT same pHash in a 2-minute burst in a flat low-risk zone
    same_phash = "a1b2c3d4e5f60718"
    fake_reports = [
        ReportClusterItem(
            report_id=f"fake-rep-{i}",
            user_id=f"bot-user-{i}",
            latitude=26.5000 + (i * 0.0001),
            longitude=92.5000 + (i * 0.0001),
            submitted_at=now - timedelta(seconds=i * 10),
            phash=same_phash,
            image_quality_score=80.0,
            landslide_confidence=0.40,
            environmental_risk=15.0,
        )
        for i in range(10)
    ]

    res = detector.analyze_cluster(cluster_id="cluster-bot-attack", reports=fake_reports)
    assert res.is_quarantine_recommended is True
    assert res.verdict == "QUARANTINE"
    assert res.coordination_risk_score >= 70.0
    assert res.visual_similarity_score >= 80.0
    assert res.burst_score >= 60.0


def test_independent_corroboration_not_quarantined():
    detector = CoordinatedFraudDetector()
    now = datetime.now(timezone.utc)

    # 4 independent witnesses submitting DIFFERENT photos over 25 minutes near a real landslide
    different_phashes = [
        "1111222233334444",
        "5555666677778888",
        "9999aaaabbbbcccc",
        "ddddeeeeffff0000",
    ]
    real_reports = [
        ReportClusterItem(
            report_id=f"real-rep-{i}",
            user_id=f"witness-{i}",
            latitude=27.4000 + (i * 0.002),
            longitude=92.6000 + (i * 0.002),
            submitted_at=now - timedelta(minutes=i * 5),
            phash=different_phashes[i],
            image_quality_score=85.0,
            landslide_confidence=0.85,
            environmental_risk=75.0,
        )
        for i in range(4)
    ]

    res = detector.analyze_cluster(cluster_id="cluster-genuine-event", reports=real_reports)
    assert res.is_quarantine_recommended is False
    assert res.verdict == "LEGITIMATE_CORROBORATION"
    assert res.independent_corroboration_score >= 65.0
    assert res.coordination_risk_score <= 35.0
