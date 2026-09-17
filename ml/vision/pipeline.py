"""
ml/vision/pipeline.py
---------------------
End-to-End Orchestrator for Citizen AI Vision, Credibility & Priority Pipeline.
Coordinates Stages A through J + 20 and handles report lifecycle state transitions.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from PIL import Image

from ml.vision.quality import evaluate_image_quality, ImageQualityResult
from ml.vision.authenticity import (
    compute_phash,
    compute_dhash,
    compute_sha256,
    check_image_reuse,
    ImageReuseResult,
)
from ml.vision.classifier import LandslideClassifier, LandslideClassificationResult
from ml.vision.segmentation import LandslideSegmenter, SegmentationResult
from ml.vision.impact import extract_visual_impact, VisualImpactResult
from ml.vision.consistency import (
    check_gps_consistency,
    check_temporal_consistency,
    GPSConsistencyResult,
    TemporalConsistencyResult,
)
from ml.vision.credibility import calculate_report_credibility, CredibilityResult
from ml.vision.priority import (
    calculate_exposure,
    calculate_response_priority,
    ExposureResult,
    ResponsePriorityResult,
)


@dataclass
class FullCitizenAnalysisResult:
    report_id: str
    status: str  # "AUTHORITY_REVIEW", "QUARANTINE", "NEEDS_EVIDENCE", "REJECTED"
    environmental_risk_score: float
    image_confidence_score: float
    report_credibility_score: float
    coordination_risk_score: float
    observed_impact_score: float
    exposure_score: float
    response_priority_score: float
    priority_level: str
    recommended_action: str
    sha256: str
    phash: str
    dhash: str
    quality: ImageQualityResult
    reuse: ImageReuseResult
    classifier: LandslideClassificationResult
    segmenter: SegmentationResult
    impact: VisualImpactResult
    gps: GPSConsistencyResult
    temporal: TemporalConsistencyResult
    credibility: CredibilityResult
    exposure: ExposureResult
    priority: ResponsePriorityResult
    processed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_api_dict(self) -> Dict[str, Any]:
        """Converts to API response dictionary per Section 23 specification."""
        return {
            "report_id": self.report_id,
            "status": self.status,
            "environmental_risk": self.environmental_risk_score,
            "image_confidence": self.image_confidence_score,
            "credibility": self.report_credibility_score,
            "observed_impact": self.observed_impact_score,
            "exposure": self.exposure_score,
            "response_priority": self.response_priority_score,
            "coordination_risk": self.coordination_risk_score,
            "priority_level": self.priority_level,
            "recommended_action": self.recommended_action,
            "landslide_detected": self.impact.landslide_present,
            "road_blockage_detected": self.impact.road_blockage_detected,
            "debris_detected": self.impact.debris_detected,
            "visible_affected_fraction": self.segmenter.visible_affected_fraction,
            "audit_positive_signals": self.credibility.positive_signals,
            "audit_risk_flags": self.credibility.risk_flags,
            "decision_path": self.priority.decision_path,
        }


class CitizenAIPipeline:
    """
    Complete Citizen AI intelligence pipeline.
    """

    def __init__(
        self,
        classifier: Optional[LandslideClassifier] = None,
        segmenter: Optional[LandslideSegmenter] = None,
    ):
        self.classifier = classifier or LandslideClassifier()
        self.segmenter = segmenter or LandslideSegmenter()

    def process_report(
        self,
        report_id: str,
        image_bytes: bytes,
        latitude: float,
        longitude: float,
        captured_at: datetime,
        submitted_at: Optional[datetime] = None,
        user_id: Optional[str] = None,
        description: Optional[str] = None,
        existing_hashes: Optional[List[str]] = None,
        environmental_risk_score: float = 50.0,
        base_susceptibility: float = 45.0,
        terrain_slope_deg: Optional[float] = None,
        distance_to_road_m: float = 150.0,
        distance_to_village_m: float = 1200.0,
        distance_to_critical_asset_m: float = 3500.0,
        coordination_risk_score: float = 0.0,
        corroboration_count: int = 1,
    ) -> FullCitizenAnalysisResult:
        """
        Runs the full multi-stage analysis pipeline for a single citizen submission.
        """
        if submitted_at is None:
            submitted_at = datetime.now(timezone.utc)

        # Stage A: Image Quality Gate
        quality_res = evaluate_image_quality(image_bytes)

        if not quality_res.is_valid:
            # Fatal quality failure -> REJECT
            sha256_hash = compute_sha256(image_bytes) if image_bytes else ""
            status = "REJECTED"
            return self._build_rejected_result(
                report_id=report_id,
                sha256=sha256_hash,
                quality=quality_res,
                environmental_risk=environmental_risk_score,
            )

        # Hash Generation (Stage B)
        sha256_hash = compute_sha256(image_bytes)
        import io
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        phash_str = compute_phash(pil_img)
        dhash_str = compute_dhash(pil_img)

        # Duplicate Check
        reuse_res = check_image_reuse(phash_str, existing_hashes or [])

        # Stage C1: Fast Landslide Classifier
        clf_res = self.classifier.predict(pil_img)

        # Stage C2: Landslide Segmentation
        seg_res = self.segmenter.segment(
            pil_img,
            is_landslide_hint=clf_res.is_landslide,
            classifier_confidence=clf_res.confidence,
        )

        # Stage D: Visual Impact Extractor
        impact_res = extract_visual_impact(
            image=pil_img,
            clf_result=clf_res,
            seg_result=seg_res,
            user_description=description,
        )

        # Stage E: GPS Consistency
        gps_res = check_gps_consistency(
            latitude=latitude,
            longitude=longitude,
            base_susceptibility=base_susceptibility,
            terrain_slope_deg=terrain_slope_deg,
            distance_to_road_m=distance_to_road_m,
        )

        # Stage F: Temporal Consistency
        temporal_res = check_temporal_consistency(
            captured_at=captured_at,
            submitted_at=submitted_at,
        )

        # Stage G: Credibility Engine
        cred_res = calculate_report_credibility(
            quality=quality_res,
            reuse=reuse_res,
            classifier=clf_res,
            segmenter=seg_res,
            gps=gps_res,
            temporal=temporal_res,
            environmental_risk_score=environmental_risk_score,
        )

        # Stage J: Exposure Analysis
        exposure_res = calculate_exposure(
            distance_to_road_m=distance_to_road_m,
            distance_to_village_m=distance_to_village_m,
            distance_to_critical_asset_m=distance_to_critical_asset_m,
        )

        # Stage 20: Response Priority Engine
        image_conf_score = round(clf_res.confidence * 100.0, 1)
        priority_res = calculate_response_priority(
            environmental_risk=environmental_risk_score,
            image_confidence=image_conf_score,
            report_credibility=cred_res.credibility_score,
            coordination_risk=coordination_risk_score,
            observed_impact=impact_res.observed_impact_score,
            exposure=exposure_res.exposure_score,
            corroboration_count=corroboration_count,
        )

        # State Machine Lifecycle (Section 22)
        if priority_res.is_quarantined:
            status = "QUARANTINE"
        elif quality_res.status == "LOW_QUALITY" and cred_res.credibility_score < 40.0:
            status = "NEEDS_EVIDENCE"
        else:
            status = "AUTHORITY_REVIEW"

        return FullCitizenAnalysisResult(
            report_id=report_id,
            status=status,
            environmental_risk_score=environmental_risk_score,
            image_confidence_score=image_conf_score,
            report_credibility_score=cred_res.credibility_score,
            coordination_risk_score=coordination_risk_score,
            observed_impact_score=impact_res.observed_impact_score,
            exposure_score=exposure_res.exposure_score,
            response_priority_score=priority_res.response_priority_score,
            priority_level=priority_res.priority_level,
            recommended_action=priority_res.recommended_action,
            sha256=sha256_hash,
            phash=phash_str,
            dhash=dhash_str,
            quality=quality_res,
            reuse=reuse_res,
            classifier=clf_res,
            segmenter=seg_res,
            impact=impact_res,
            gps=gps_res,
            temporal=temporal_res,
            credibility=cred_res,
            exposure=exposure_res,
            priority=priority_res,
        )

    def _build_rejected_result(
        self,
        report_id: str,
        sha256: str,
        quality: ImageQualityResult,
        environmental_risk: float,
    ) -> FullCitizenAnalysisResult:
        # Construct fallback blank objects for rejected image
        from ml.vision.authenticity import ImageReuseResult
        from ml.vision.classifier import LandslideClassificationResult
        from ml.vision.segmentation import SegmentationResult
        from ml.vision.impact import VisualImpactResult
        from ml.vision.consistency import GPSConsistencyResult, TemporalConsistencyResult
        from ml.vision.credibility import CredibilityResult
        from ml.vision.priority import ExposureResult, ResponsePriorityResult

        reuse_dummy = ImageReuseResult(
            is_duplicate=False, min_hamming_distance=64, matched_hash=None,
            image_reuse_score=0.0, verdict="REJECTED", explanation="Invalid image",
        )
        clf_dummy = LandslideClassificationResult(
            predicted_class="NON_LANDSLIDE", confidence=0.0,
            class_probabilities={"LANDSLIDE": 0.0, "NON_LANDSLIDE": 1.0, "UNCERTAIN": 0.0},
            is_landslide=False, model_name=self.classifier.model_name,
            model_version=self.classifier.model_version,
        )
        seg_dummy = SegmentationResult(
            segmentation_confidence=0.0, visible_affected_fraction=0.0,
            mask_width=0, mask_height=0, bounding_box=None,
            model_name=self.segmenter.model_name, model_version=self.segmenter.model_version,
        )
        impact_dummy = VisualImpactResult(
            landslide_present=False, landslide_confidence=0.0, visible_area_fraction=0.0,
            debris_detected=False, road_blockage_detected=False, water_or_mud_detected=False,
            vegetation_loss_detected=False, structure_damage_detected=False,
            debris_score=0.0, road_blockage_score=0.0, structure_damage_score=0.0,
            observed_impact_score=0.0, impact_level="LOW",
        )
        gps_dummy = GPSConsistencyResult(
            gps_consistency_score=0.0, in_ner_bounds=False, is_terrain_consistent=False,
            nearest_hazard_zone="FLAT",
        )
        temp_dummy = TemporalConsistencyResult(
            temporal_consistency_score=0.0, delay_hours=0.0, is_plausible=False, exif_match=None,
        )
        cred_dummy = CredibilityResult(
            credibility_score=0.0, credibility_tier="SUSPICIOUS", is_credible=False,
            model_version="1.0.0", risk_flags=quality.issues,
        )
        exp_dummy = ExposureResult(
            exposure_score=0.0, exposure_level="LOW",
            distance_to_road_m=0.0, distance_to_village_m=0.0, distance_to_critical_asset_m=0.0,
        )
        priority_dummy = ResponsePriorityResult(
            response_priority_score=0.0, priority_level="LOW", recommended_action="ARCHIVE",
            environmental_risk_score=environmental_risk, image_confidence_score=0.0,
            report_credibility_score=0.0, coordination_risk_score=0.0,
            observed_impact_score=0.0, exposure_score=0.0, corroboration_count=0,
            is_quarantined=False, explanation={"reason": "Rejected due to invalid image quality."},
        )

        return FullCitizenAnalysisResult(
            report_id=report_id,
            status="REJECTED",
            environmental_risk_score=environmental_risk,
            image_confidence_score=0.0,
            report_credibility_score=0.0,
            coordination_risk_score=0.0,
            observed_impact_score=0.0,
            exposure_score=0.0,
            response_priority_score=0.0,
            priority_level="LOW",
            recommended_action="ARCHIVE",
            sha256=sha256,
            phash="",
            dhash="",
            quality=quality,
            reuse=reuse_dummy,
            classifier=clf_dummy,
            segmenter=seg_dummy,
            impact=impact_dummy,
            gps=gps_dummy,
            temporal=temp_dummy,
            credibility=cred_dummy,
            exposure=exp_dummy,
            priority=priority_dummy,
        )
