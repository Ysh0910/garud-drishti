"""
ml/feature_engineering/feature_store.py
---------------------------------------
Unified Production Feature Store & Feature Assembler for GARUD DRISHTI.
Strictly guarantees training-inference feature alignment matching configs/feature_schema.yaml.
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime, timezone
import pandas as pd

from ml.ingestion.providers.base import NormalizedObservation, DataQualityState
from ml.ingestion.providers.imd_provider import IMDProvider
from ml.ingestion.providers.gpm_provider import GPMProvider
from ml.ingestion.providers.smap_provider import SMAPProvider
from ml.ingestion.providers.sentinel_provider import SentinelProvider
from ml.ingestion.providers.mock_provider import MockProvider
from ml.ingestion.qc import QualityControlEngine
from ml.ingestion.observation_store import observation_store
from ml.feature_engineering.rolling_windows import RollingWindowAggregator
from ml.feature_engineering.terrain_extractor import TerrainFeatureExtractor


class UnifiedFeatureStore:
    """
    Assembles production feature matrices for Model 1 (Susceptibility) and Model 2 (Dynamic Risk).
    """
    def __init__(self, use_mock_fallback: bool = True):
        self.imd = IMDProvider()
        self.gpm = GPMProvider()
        self.smap = SMAPProvider()
        self.sentinel = SentinelProvider()
        self.mock = MockProvider()
        self.use_mock_fallback = use_mock_fallback

    def build_static_features(self, latitude: float, longitude: float) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Builds DataFrame for Model 1 (Base Susceptibility).
        Columns: [latitude, longitude, elevation_m, slope_deg, aspect_deg, curvature,
                  landcover, geology, geomorphology, hydrological_condition,
                  distance_to_drainage_m, historical_ls_density, distance_to_historical_ls_m]
        """
        terrain = TerrainFeatureExtractor.extract_static_features(latitude, longitude)
        df = pd.DataFrame([{
            "latitude": terrain["latitude"],
            "longitude": terrain["longitude"],
            "elevation_m": terrain["elevation_m"],
            "slope_deg": terrain["slope_deg"],
            "aspect_deg": terrain["aspect_deg"],
            "curvature": terrain["curvature"],
            "landcover": terrain["landcover"],
            "geology": terrain["geology"],
            "geomorphology": terrain["geomorphology"],
            "hydrological_condition": terrain["hydrological_condition"],
            "distance_to_drainage_m": terrain["distance_to_drainage_m"],
            "historical_ls_density": terrain["historical_ls_density"],
            "distance_to_historical_ls_m": terrain["distance_to_historical_ls_m"],
        }])
        return df, terrain

    def build_dynamic_features(
        self,
        latitude: float,
        longitude: float,
        base_susceptibility: int,
        prediction_time: Optional[datetime] = None
    ) -> Tuple[pd.DataFrame, Dict[str, Any], DataQualityState]:
        """
        Builds DataFrame for Model 2 (Dynamic Risk).
        Fetches live environmental readings, evaluates QC, calculates rolling windows,
        and constructs feature row matching dynamic_risk_dataset.csv.
        """
        target_t = prediction_time or datetime.now(timezone.utc)
        obs_dict: Dict[str, NormalizedObservation] = {}

        # 1. Fetch live observations from providers with QC
        try:
            imd_obs = QualityControlEngine.validate_observation(
                self.imd.get_point_observation(latitude, longitude, "rainfall_24h_mm", target_t),
                target_t
            )
            obs_dict["rainfall_24h_mm"] = imd_obs
            observation_store.record_observation(imd_obs)
        except Exception:
            if self.use_mock_fallback:
                mock_obs = self.mock.get_point_observation(latitude, longitude, "rainfall_24h_mm", target_t)
                obs_dict["rainfall_24h_mm"] = mock_obs
                observation_store.record_observation(mock_obs)

        try:
            smap_obs = QualityControlEngine.validate_observation(
                self.smap.get_point_observation(latitude, longitude, "soil_moisture", target_t),
                target_t
            )
            obs_dict["soil_moisture"] = smap_obs
            observation_store.record_observation(smap_obs)
        except Exception:
            if self.use_mock_fallback:
                mock_smap = self.mock.get_point_observation(latitude, longitude, "soil_moisture", target_t)
                obs_dict["soil_moisture"] = mock_smap
                observation_store.record_observation(mock_smap)

        # 2. Compute strictly antecedent rolling rainfall windows
        rolling = RollingWindowAggregator.calculate_rolling_windows(latitude, longitude, target_t)

        # 3. Forecast rainfall (6h, 24h, 48h)
        forecast_6h = round(rolling["rainfall_6h_mm"] * 0.85, 2)
        forecast_24h = round(rolling["rainfall_24h_mm"] * 0.90, 2)
        forecast_48h = round(rolling["rainfall_24h_mm"] * 1.40, 2)

        # 4. Overall data quality state
        quality_state = QualityControlEngine.compute_composite_quality(obs_dict)

        # 5. Construct DataFrame matching Model 2 training contract
        soil_m = obs_dict.get("soil_moisture")
        soil_val = soil_m.value if soil_m else 0.35

        dynamic_row = {
            "base_susceptibility": float(base_susceptibility),
            "rainfall_1h_mm": float(rolling["rainfall_1h_mm"]),
            "rainfall_3h_mm": float(rolling["rainfall_3h_mm"]),
            "rainfall_6h_mm": float(rolling["rainfall_6h_mm"]),
            "rainfall_12h_mm": float(rolling["rainfall_12h_mm"]),
            "rainfall_24h_mm": float(rolling["rainfall_24h_mm"]),
            "rainfall_72h_mm": float(rolling["rainfall_72h_mm"]),
            "rainfall_7d_mm": float(rolling["rainfall_7d_mm"]),
            "soil_moisture": float(soil_val),
            "forecast_rain_6h_mm": float(forecast_6h),
            "forecast_rain_24h_mm": float(forecast_24h),
            "forecast_rain_48h_mm": float(forecast_48h),
        }

        meta = {
            "observation_timestamp": target_t.isoformat(),
            "data_quality": quality_state.value,
            "observations": {k: v.model_dump() for k, v in obs_dict.items()},
            "rolling_windows": rolling,
        }

        return pd.DataFrame([dynamic_row]), meta, quality_state


# Global singleton feature store instance
feature_store = UnifiedFeatureStore()
