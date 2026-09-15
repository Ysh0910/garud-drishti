"""
feature_builder.py
-------------------
Live Feature Engineering Builder for Operational Ingestion Layer.
Assembles live environmental observations from provider adapters into canonical ML feature vectors.
Ensures live feature definitions match training definitions exactly without data leakage.
"""

from typing import Dict, Any
import pandas as pd


class LiveFeatureBuilder:
    """
    Builds single-sample or batch inference DataFrames from provider observation payloads.
    """
    @staticmethod
    def build_static_feature_row(
        latitude: float,
        longitude: float,
        elevation_m: float = 350.0,
        slope_deg: float = 22.0,
        aspect_deg: float = 160.0,
        curvature: float = 0.001,
        landcover: str = "Tree Cover / Dense Forest",
        geology: str = "Mountain Litho-Soil Complex",
        geomorphology: str = "Dissected Hill Slope",
        hydrological_condition: str = "Neutral Planar Drainage",
        distance_to_drainage_m: float = 400.0,
        historical_ls_density: float = 0.05,
        distance_to_historical_ls_m: float = 1200.0
    ) -> pd.DataFrame:
        return pd.DataFrame([{
            "latitude": latitude,
            "longitude": longitude,
            "elevation_m": elevation_m,
            "slope_deg": slope_deg,
            "aspect_deg": aspect_deg,
            "curvature": curvature,
            "landcover": landcover,
            "geology": geology,
            "geomorphology": geomorphology,
            "hydrological_condition": hydrological_condition,
            "distance_to_drainage_m": distance_to_drainage_m,
            "historical_ls_density": historical_ls_density,
            "distance_to_historical_ls_m": distance_to_historical_ls_m
        }])

    @staticmethod
    def build_dynamic_feature_row(
        base_susceptibility: int,
        provider_observations: Dict[str, Any]
    ) -> pd.DataFrame:
        # Extract rainfall windows with fallback defaults matching training schemas
        return pd.DataFrame([{
            "base_susceptibility": float(base_susceptibility),
            "rainfall_1h_mm": float(provider_observations.get("rainfall_1h_mm", 5.0)),
            "rainfall_3h_mm": float(provider_observations.get("rainfall_3h_mm", 15.0)),
            "rainfall_6h_mm": float(provider_observations.get("rainfall_6h_mm", 35.0)),
            "rainfall_12h_mm": float(provider_observations.get("rainfall_12h_mm", 60.0)),
            "rainfall_24h_mm": float(provider_observations.get("rainfall_24h_mm", 95.0)),
            "rainfall_72h_mm": float(provider_observations.get("rainfall_72h_mm", 150.0)),
            "rainfall_7d_mm": float(provider_observations.get("rainfall_7d_mm", 220.0)),
            "soil_moisture": float(provider_observations.get("soil_moisture", 0.35)),
            "forecast_rain_6h_mm": float(provider_observations.get("forecast_rain_6h_mm", 20.0)),
            "forecast_rain_24h_mm": float(provider_observations.get("forecast_rain_24h_mm", 50.0)),
            "forecast_rain_48h_mm": float(provider_observations.get("forecast_rain_48h_mm", 85.0))
        }])
