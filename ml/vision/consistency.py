"""
ml/vision/consistency.py
------------------------
Stage E & F: GPS/GIS Consistency and Temporal Analysis.
Evaluates geospatial plausibility (NER bounds, slope/susceptibility alignment)
and temporal integrity (submission delays, EXIF reconciliation).
Adheres strictly to Rule 3: Missing EXIF is NEVER treated as fraud.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Dict, List, Optional, Any


@dataclass
class GPSConsistencyResult:
    gps_consistency_score: float  # 0.0 - 100.0
    in_ner_bounds: bool
    is_terrain_consistent: bool
    nearest_hazard_zone: str  # "HIGH", "MODERATE", "LOW", "FLAT"
    details: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


@dataclass
class TemporalConsistencyResult:
    temporal_consistency_score: float  # 0.0 - 100.0
    delay_hours: float
    is_plausible: bool
    exif_match: Optional[bool]
    details: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


# North Eastern Region (NER) approximate bounding box:
# Lat: 21.5°N to 29.5°N, Lon: 89.5°E to 97.5°E
NER_LAT_MIN = 21.5
NER_LAT_MAX = 29.5
NER_LON_MIN = 89.5
NER_LON_MAX = 97.5


def check_gps_consistency(
    latitude: float,
    longitude: float,
    base_susceptibility: float,
    terrain_slope_deg: Optional[float] = None,
    distance_to_road_m: Optional[float] = None,
    distance_to_historical_ls_m: Optional[float] = None,
) -> GPSConsistencyResult:
    """
    Checks if report coordinates are physically and geographically plausible.
    """
    warnings: List[str] = []

    # Check NER bounding box
    in_ner = (NER_LAT_MIN <= latitude <= NER_LAT_MAX) and (NER_LON_MIN <= longitude <= NER_LON_MAX)
    if not in_ner:
        warnings.append(f"Coordinates ({latitude:.4f}, {longitude:.4f}) lie outside the North Eastern Region.")

    # Check susceptibility
    # In hilly NER terrain, landslides typically occur on slopes > 15° with moderate to high susceptibility
    if base_susceptibility >= 60.0:
        nearest_hazard = "HIGH"
        susc_score = 95.0
    elif base_susceptibility >= 35.0:
        nearest_hazard = "MODERATE"
        susc_score = 80.0
    elif base_susceptibility >= 15.0:
        nearest_hazard = "LOW"
        susc_score = 55.0
    else:
        nearest_hazard = "FLAT"
        susc_score = 30.0
        warnings.append("Base susceptibility is very low for typical landslide terrain.")

    slope_score = 85.0
    if terrain_slope_deg is not None:
        if terrain_slope_deg < 5.0:
            slope_score = 25.0
            warnings.append(f"Reported location has very flat slope ({terrain_slope_deg:.1f}°).")
        elif terrain_slope_deg < 15.0:
            slope_score = 60.0
        else:
            slope_score = 95.0

    # Road proximity score
    road_score = 85.0
    if distance_to_road_m is not None:
        if distance_to_road_m < 200.0:
            road_score = 95.0
        elif distance_to_road_m < 1000.0:
            road_score = 80.0
        else:
            road_score = 65.0

    # Proximity to historical landslides
    hist_score = 75.0
    if distance_to_historical_ls_m is not None:
        if distance_to_historical_ls_m < 1500.0:
            hist_score = 95.0
        elif distance_to_historical_ls_m < 5000.0:
            hist_score = 80.0
        else:
            hist_score = 60.0

    # Weighted score
    geo_factor = 1.0 if in_ner else 0.4
    calc_score = ((susc_score * 0.40) + (slope_score * 0.30) + (road_score * 0.15) + (hist_score * 0.15)) * geo_factor
    final_score = round(max(0.0, min(100.0, calc_score)), 1)
    is_terrain_consistent = bool(base_susceptibility >= 20.0 or (terrain_slope_deg is not None and terrain_slope_deg >= 10.0))

    details = {
        "base_susceptibility": base_susceptibility,
        "terrain_slope_deg": terrain_slope_deg,
        "distance_to_road_m": distance_to_road_m,
        "distance_to_historical_ls_m": distance_to_historical_ls_m,
    }

    return GPSConsistencyResult(
        gps_consistency_score=final_score,
        in_ner_bounds=in_ner,
        is_terrain_consistent=is_terrain_consistent,
        nearest_hazard_zone=nearest_hazard,
        details=details,
        warnings=warnings,
    )


def check_temporal_consistency(
    captured_at: datetime,
    submitted_at: datetime,
    exif_timestamp: Optional[datetime] = None,
) -> TemporalConsistencyResult:
    """
    Checks temporal plausibility between observation time and upload time.
    Enforces Rule: Missing EXIF is NEVER treated as fraud.
    """
    warnings: List[str] = []

    # Ensure timezone awareness
    if captured_at.tzinfo is None:
        captured_at = captured_at.replace(tzinfo=timezone.utc)
    if submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)

    # Delay in hours
    diff_sec = (submitted_at - captured_at).total_seconds()
    delay_hours = diff_sec / 3600.0

    # Future timestamp check
    if delay_hours < -0.1:  # captured in the future
        warnings.append(f"Observation timestamp is in the future relative to server time ({abs(delay_hours):.1f}h ahead).")
        return TemporalConsistencyResult(
            temporal_consistency_score=10.0,
            delay_hours=round(delay_hours, 2),
            is_plausible=False,
            exif_match=False,
            details={"delay_hours": delay_hours},
            warnings=warnings,
        )

    # Plausibility scoring
    if delay_hours <= 2.0:
        # Immediate / live report
        temp_score = 95.0
    elif delay_hours <= 12.0:
        # Same day report
        temp_score = 85.0
    elif delay_hours <= 48.0:
        # Offline sync within 2 days
        temp_score = 75.0
    elif delay_hours <= 168.0:  # 1 week
        temp_score = 55.0
        warnings.append(f"Report submitted {delay_hours/24.0:.1f} days after observation.")
    else:
        temp_score = 35.0
        warnings.append(f"Extremely delayed report submitted {delay_hours/24.0:.1f} days after observation.")

    # EXIF evaluation if available
    exif_match = None
    if exif_timestamp is not None:
        if exif_timestamp.tzinfo is None:
            exif_timestamp = exif_timestamp.replace(tzinfo=timezone.utc)
        exif_diff_min = abs((exif_timestamp - captured_at).total_seconds()) / 60.0
        if exif_diff_min <= 15.0:
            exif_match = True
            temp_score = min(100.0, temp_score + 5.0)
        else:
            exif_match = False
            warnings.append(f"EXIF capture time differs from reported capture time by {exif_diff_min:.1f} minutes.")
            temp_score = max(20.0, temp_score - 20.0)

    final_score = round(max(0.0, min(100.0, temp_score)), 1)
    is_plausible = (delay_hours >= 0.0 and delay_hours <= 168.0)

    return TemporalConsistencyResult(
        temporal_consistency_score=final_score,
        delay_hours=round(delay_hours, 2),
        is_plausible=is_plausible,
        exif_match=exif_match,
        details={"delay_hours": round(delay_hours, 2), "has_exif": exif_timestamp is not None},
        warnings=warnings,
    )
