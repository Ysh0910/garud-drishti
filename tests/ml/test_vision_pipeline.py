"""
tests/ml/test_vision_pipeline.py
--------------------------------
Unit and integration tests for Landslide CV, Segmentation, Impact, and Pipeline Orchestration.
"""

from datetime import datetime, timezone, timedelta
import io
import numpy as np
from PIL import Image
import pytest

from ml.vision.classifier import LandslideClassifier
from ml.vision.segmentation import LandslideSegmenter
from ml.vision.impact import extract_visual_impact
from ml.vision.consistency import check_gps_consistency, check_temporal_consistency
from ml.vision.pipeline import CitizenAIPipeline


def make_soil_debris_image(width=300, height=300):
    """Creates synthetic image with exposed soil and debris characteristics."""
    arr = np.zeros((height, width, 3), dtype=np.uint8)
    # Soil brown tone: R=150, G=100, B=60
    arr[:, :] = [160, 110, 65]
    # Add scarp roughness
    noise = np.random.randint(-40, 40, (height, width, 3), dtype=np.int16)
    arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue(), img


def make_sky_image(width=300, height=300):
    """Creates synthetic blue sky / non-landslide image."""
    arr = np.full((height, width, 3), [100, 180, 240], dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue(), img


def test_classifier_output_structure():
    clf = LandslideClassifier()
    _, img = make_soil_debris_image()
    res = clf.predict(img)

    assert res.predicted_class in ("LANDSLIDE", "NON_LANDSLIDE", "UNCERTAIN")
    assert 0.0 <= res.confidence <= 1.0
    assert "LANDSLIDE" in res.class_probabilities
    assert "NON_LANDSLIDE" in res.class_probabilities
    assert res.model_version == "1.0.0"
    assert res.model_name == "garud-mobilenetv3-landslide-v1"


def test_segmenter_output_structure():
    segmenter = LandslideSegmenter()
    _, img = make_soil_debris_image()
    res = segmenter.segment(img, is_landslide_hint=True, classifier_confidence=0.85)

    assert 0.0 <= res.segmentation_confidence <= 1.0
    assert 0.0 <= res.visible_affected_fraction <= 1.0
    assert res.mask_width == 256
    assert res.mask_height == 256
    assert res.model_version == "1.0.0"


def test_visual_impact_extraction():
    clf = LandslideClassifier()
    segmenter = LandslideSegmenter()
    _, img = make_soil_debris_image()

    clf_res = clf.predict(img)
    seg_res = segmenter.segment(img, is_landslide_hint=clf_res.is_landslide, classifier_confidence=clf_res.confidence)
    impact_res = extract_visual_impact(img, clf_res, seg_res, user_description="Major road blocked by rockfall debris")

    assert 0.0 <= impact_res.observed_impact_score <= 100.0
    assert impact_res.impact_level in ("LOW", "MEDIUM", "HIGH", "SEVERE")
    assert isinstance(impact_res.road_blockage_detected, bool)
    assert isinstance(impact_res.debris_detected, bool)


def test_gps_consistency_ner_and_out_of_bounds():
    # Inside NER (Guwahati approx 26.14°N, 91.73°E)
    res_in = check_gps_consistency(26.14, 91.73, base_susceptibility=65.0, terrain_slope_deg=22.0)
    assert res_in.in_ner_bounds is True
    assert res_in.gps_consistency_score >= 70.0
    assert res_in.is_terrain_consistent is True

    # Outside NER (Mumbai 19.07°N, 72.87°E)
    res_out = check_gps_consistency(19.07, 72.87, base_susceptibility=50.0)
    assert res_out.in_ner_bounds is False
    assert len(res_out.warnings) > 0


def test_temporal_consistency_rule_missing_exif():
    now = datetime.now(timezone.utc)
    cap_time = now - timedelta(hours=3)

    # Missing EXIF should NOT cause fraud rejection (Rule 3)
    res = check_temporal_consistency(captured_at=cap_time, submitted_at=now, exif_timestamp=None)
    assert res.is_plausible is True
    assert res.temporal_consistency_score >= 70.0
    assert res.exif_match is None


def test_end_to_end_pipeline_execution():
    pipeline = CitizenAIPipeline()
    img_bytes, _ = make_soil_debris_image()

    res = pipeline.process_report(
        report_id="test-rep-001",
        image_bytes=img_bytes,
        latitude=27.33,
        longitude=92.55,
        captured_at=datetime.now(timezone.utc) - timedelta(hours=1),
        description="Debris blocking local road",
        environmental_risk_score=75.0,
        base_susceptibility=60.0,
    )

    assert res.report_id == "test-rep-001"
    assert res.status in ("AUTHORITY_REVIEW", "NEEDS_EVIDENCE")
    assert 0.0 <= res.response_priority_score <= 100.0
    assert 0.0 <= res.report_credibility_score <= 100.0
    assert 0.0 <= res.environmental_risk_score <= 100.0
    assert 0.0 <= res.observed_impact_score <= 100.0
    assert 0.0 <= res.exposure_score <= 100.0
    assert len(res.sha256) == 64
    assert len(res.phash) == 16

    api_dict = res.to_api_dict()
    assert "response_priority" in api_dict
    assert "credibility" in api_dict
    assert "environmental_risk" in api_dict
    assert "observed_impact" in api_dict
    assert "exposure" in api_dict
