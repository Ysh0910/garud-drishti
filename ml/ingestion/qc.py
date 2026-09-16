"""
ml/ingestion/qc.py
------------------
Quality Control (QC) & Data Freshness Engine for Environmental Observations.
Strictly implements AGENTS.md §11 (Missing Data vs Zero), §35 (API Failure Handling),
and §36 (Data Freshness).
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone, timedelta
from ml.ingestion.providers.base import NormalizedObservation, DataQualityState

# Physical validity ranges for environmental observation variables
VARIABLE_VALIDITY_RANGES: Dict[str, Tuple[float, float]] = {
    "rainfall_1h_mm": (0.0, 300.0),
    "rainfall_3h_mm": (0.0, 500.0),
    "rainfall_6h_mm": (0.0, 700.0),
    "rainfall_12h_mm": (0.0, 1000.0),
    "rainfall_24h_mm": (0.0, 1500.0),
    "rainfall_72h_mm": (0.0, 2500.0),
    "rainfall_7d_mm": (0.0, 4000.0),
    "soil_moisture": (0.0, 1.0),
    "elevation_m": (-50.0, 8848.0),
    "slope_deg": (0.0, 90.0),
    "aspect_deg": (0.0, 360.0),
    "curvature": (-0.1, 0.1),
    "forecast_rain_6h_mm": (0.0, 500.0),
    "forecast_rain_24h_mm": (0.0, 1500.0),
    "forecast_rain_48h_mm": (0.0, 2500.0),
    "surface_disturbance_score": (0.0, 1.0),
}

# Freshness thresholds (hours)
STALENESS_HOURS_DEGRADED = 3.0
STALENESS_HOURS_STALE = 12.0
STALENESS_HOURS_EXPIRED = 48.0


class QualityControlEngine:
    """
    Validates, sanitizes, and evaluates the freshness of observations.
    """
    @classmethod
    def validate_observation(
        cls,
        obs: NormalizedObservation,
        reference_time: Optional[datetime] = None
    ) -> NormalizedObservation:
        """
        Validates value ranges and assesses freshness state against reference time.
        """
        now = reference_time or datetime.now(timezone.utc)
        
        # 1. Range Validation
        var_name = obs.variable
        if var_name in VARIABLE_VALIDITY_RANGES:
            min_val, max_val = VARIABLE_VALIDITY_RANGES[var_name]
            if obs.value < min_val or obs.value > max_val:
                obs.quality = DataQualityState.DEGRADED
                obs.metadata["qc_warning"] = f"Value {obs.value} outside physical range [{min_val}, {max_val}]"
                obs.value = max(min_val, min(max_val, obs.value))

        # 2. Freshness & Staleness Evaluation
        try:
            obs_dt = datetime.fromisoformat(obs.timestamp.replace("Z", "+00:00"))
            age_hours = (now - obs_dt).total_seconds() / 3600.0

            if age_hours < 0:
                # Future timestamp detected (Anti-leakage guard)
                obs.quality = DataQualityState.DEGRADED
                obs.metadata["qc_error"] = "Observation timestamp is in the future relative to evaluation reference"
            elif age_hours <= STALENESS_HOURS_DEGRADED:
                obs.stale = False
                if obs.quality != DataQualityState.DEGRADED:
                    obs.quality = DataQualityState.GOOD
            elif age_hours <= STALENESS_HOURS_STALE:
                obs.stale = True
                obs.quality = DataQualityState.DEGRADED
                obs.metadata["qc_staleness"] = f"Observation is {age_hours:.1f}h old (degraded)"
            else:
                obs.stale = True
                obs.quality = DataQualityState.STALE
                obs.metadata["qc_staleness"] = f"Observation is {age_hours:.1f}h old (stale)"
        except Exception as e:
            obs.quality = DataQualityState.DEGRADED
            obs.metadata["qc_timestamp_parse_error"] = str(e)

        return obs

    @classmethod
    def compute_composite_quality(cls, observations: Dict[str, NormalizedObservation]) -> DataQualityState:
        """
        Computes overall data quality state for an assembled feature set.
        """
        if not observations:
            return DataQualityState.MISSING

        qualities = [obs.quality for obs in observations.values()]

        if any(q == DataQualityState.MISSING for q in qualities):
            return DataQualityState.DEGRADED
        if any(q == DataQualityState.STALE for q in qualities):
            return DataQualityState.STALE
        if any(q == DataQualityState.DEGRADED for q in qualities):
            return DataQualityState.DEGRADED

        return DataQualityState.GOOD
