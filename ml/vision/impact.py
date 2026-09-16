"""
ml/vision/impact.py
-------------------
Stage D & Stage I: Visual Impact and Physical Feature Extraction.
Extracts structured observations:
  - landslide_present
  - landslide_confidence
  - visible_area_fraction
  - debris_detected
  - road_blockage_detected
  - water_or_mud_detected
  - vegetation_loss_detected
  - structure_damage_detected
  - observed_impact_score (0-100)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import numpy as np
from PIL import Image

from ml.vision.classifier import LandslideClassificationResult
from ml.vision.segmentation import SegmentationResult


@dataclass
class VisualImpactResult:
    landslide_present: bool
    landslide_confidence: float
    visible_area_fraction: float
    debris_detected: bool
    road_blockage_detected: bool
    water_or_mud_detected: bool
    vegetation_loss_detected: bool
    structure_damage_detected: bool
    debris_score: float  # 0.0 - 100.0
    road_blockage_score: float  # 0.0 - 100.0
    structure_damage_score: float  # 0.0 - 100.0
    observed_impact_score: float  # 0.0 - 100.0
    impact_level: str  # "LOW", "MEDIUM", "HIGH", "SEVERE"
    extracted_features: Dict[str, Any] = field(default_factory=dict)


def extract_visual_impact(
    image: Image.Image,
    clf_result: LandslideClassificationResult,
    seg_result: SegmentationResult,
    user_description: Optional[str] = None,
) -> VisualImpactResult:
    """
    Extracts structured impact evidence by combining CV classification,
    segmentation geometry, and visual pixel characteristics.
    """
    desc = (user_description or "").lower()
    text_road_hint = any(w in desc for w in ["road", "highway", "traffic", "blocked", "pass", "route"])
    text_damage_hint = any(w in desc for w in ["house", "building", "structure", "wall", "crushed", "damage", "bridge"])
    text_mud_hint = any(w in desc for w in ["mud", "water", "slurry", "flow", "stream", "flood"])

    # Image pixel features
    w, h = 256, 256
    rgb_img = image.convert("RGB").resize((w, h), Image.Resampling.BILINEAR)
    img_np = np.array(rgb_img, dtype=np.float32) / 255.0

    r, g, b = img_np[:, :, 0], img_np[:, :, 1], img_np[:, :, 2]
    
    # Asphalt / concrete road indicator (low saturation, dark grey to light grey)
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    saturation = np.where(max_c > 0, (max_c - min_c) / (max_c + 1e-6), 0)
    gray_mask = (saturation < 0.18) & (img_np[:, :, 0] > 0.15) & (img_np[:, :, 0] < 0.75)
    road_like_ratio = float(np.mean(gray_mask))

    # Water / wet mud indicator (dark, specular highlights, or brownish wet slurry)
    wet_mud_mask = (img_np[:, :, 0] > 0.18) & (img_np[:, :, 0] < 0.45) & (img_np[:, :, 1] < 0.35) & (saturation < 0.35)
    wet_mud_ratio = float(np.mean(wet_mud_mask))

    # Debris presence
    vis_frac = seg_result.visible_affected_fraction
    debris_detected = bool(clf_result.is_landslide and vis_frac > 0.03)
    debris_score = min(100.0, (vis_frac / 0.35) * 80.0 + (clf_result.confidence * 20.0)) if debris_detected else 0.0

    # Road blockage detection
    road_blockage_detected = bool((clf_result.is_landslide and (road_like_ratio > 0.10 and vis_frac > 0.05)) or (clf_result.is_landslide and text_road_hint and vis_frac > 0.03))
    road_blockage_score = min(100.0, (road_like_ratio * 120.0) + (vis_frac * 100.0) + (25.0 if text_road_hint else 0.0)) if road_blockage_detected else 0.0

    # Water / mud detection
    water_or_mud_detected = bool(wet_mud_ratio > 0.08 or (text_mud_hint and clf_result.is_landslide))

    # Vegetation loss (scarp exposed with brown earth next to green canopy)
    vegetation_loss_detected = bool(clf_result.is_landslide and vis_frac > 0.08)

    # Structure damage detection
    structure_damage_detected = bool(text_damage_hint and clf_result.is_landslide)
    structure_damage_score = 75.0 if (structure_damage_detected and vis_frac > 0.10) else (40.0 if structure_damage_detected else 0.0)

    # Calculate overall observed impact score (0-100)
    if not clf_result.is_landslide and vis_frac < 0.02:
        observed_impact = 0.0
    else:
        # Weighted synthesis
        impact_calc = (
            (min(1.0, vis_frac / 0.30) * 40.0) +
            ((debris_score / 100.0) * 20.0) +
            ((road_blockage_score / 100.0) * 25.0) +
            ((structure_damage_score / 100.0) * 15.0)
        )
        observed_impact = round(min(100.0, max(5.0, impact_calc)), 1)

    if observed_impact >= 75.0:
        impact_level = "SEVERE"
    elif observed_impact >= 50.0:
        impact_level = "HIGH"
    elif observed_impact >= 25.0:
        impact_level = "MEDIUM"
    else:
        impact_level = "LOW"

    extracted_features = {
        "road_like_pixel_ratio": round(road_like_ratio, 3),
        "wet_mud_pixel_ratio": round(wet_mud_ratio, 3),
        "text_road_hint": text_road_hint,
        "text_damage_hint": text_damage_hint,
    }

    return VisualImpactResult(
        landslide_present=clf_result.is_landslide,
        landslide_confidence=clf_result.confidence,
        visible_area_fraction=vis_frac,
        debris_detected=debris_detected,
        road_blockage_detected=road_blockage_detected,
        water_or_mud_detected=water_or_mud_detected,
        vegetation_loss_detected=vegetation_loss_detected,
        structure_damage_detected=structure_damage_detected,
        debris_score=round(debris_score, 1),
        road_blockage_score=round(road_blockage_score, 1),
        structure_damage_score=round(structure_damage_score, 1),
        observed_impact_score=observed_impact,
        impact_level=impact_level,
        extracted_features=extracted_features,
    )
