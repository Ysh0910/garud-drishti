"""
ml/vision/__init__.py
---------------------
GARUD DRISHTI Citizen AI & Computer Vision Intelligence Package.
"""

from ml.vision.quality import evaluate_image_quality, ImageQualityResult
from ml.vision.authenticity import (
    compute_phash,
    compute_dhash,
    compute_sha256,
    hamming_distance,
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
from ml.vision.coordination import CoordinatedFraudDetector, CoordinationAnalysisResult
from ml.vision.priority import (
    calculate_exposure,
    calculate_response_priority,
    ExposureResult,
    ResponsePriorityResult,
)
from ml.vision.pipeline import CitizenAIPipeline, FullCitizenAnalysisResult

__all__ = [
    "evaluate_image_quality",
    "ImageQualityResult",
    "compute_phash",
    "compute_dhash",
    "compute_sha256",
    "hamming_distance",
    "check_image_reuse",
    "ImageReuseResult",
    "LandslideClassifier",
    "LandslideClassificationResult",
    "LandslideSegmenter",
    "SegmentationResult",
    "extract_visual_impact",
    "VisualImpactResult",
    "check_gps_consistency",
    "check_temporal_consistency",
    "GPSConsistencyResult",
    "TemporalConsistencyResult",
    "calculate_report_credibility",
    "CredibilityResult",
    "CoordinatedFraudDetector",
    "CoordinationAnalysisResult",
    "calculate_exposure",
    "calculate_response_priority",
    "ExposureResult",
    "ResponsePriorityResult",
    "CitizenAIPipeline",
    "FullCitizenAnalysisResult",
]
