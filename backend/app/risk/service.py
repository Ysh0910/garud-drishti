"""
service.py
----------
FastAPI Risk Assessment Service linking Environmental Data Providers,
Live Feature Builder, and GarudDrishtiInferenceEngine.
Strictly implements contracts/risk.md and contracts/ml.md interfaces.
"""

import datetime
from pathlib import Path
import sys
from typing import Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from ml.inference.predictor import GarudDrishtiInferenceEngine
from ml.ingestion.feature_builder import LiveFeatureBuilder
from backend.app.providers.gpm import GPMProviderAdapter
from backend.app.providers.imd import IMDProviderAdapter
from backend.app.providers.mock import MockDataProvider
from backend.app.providers.smap import SMAPProviderAdapter


class RiskAssessmentService:
    def __init__(self, use_mock_providers: bool = False):
        self.inference_engine = GarudDrishtiInferenceEngine()
        self.gpm_provider = GPMProviderAdapter()
        self.imd_provider = IMDProviderAdapter()
        self.smap_provider = SMAPProviderAdapter()
        self.mock_provider = MockDataProvider()
        self.use_mock_providers = use_mock_providers

    async def assess_point_risk(
        self,
        latitude: float,
        longitude: float,
        static_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end point risk assessment:
        1. Build static feature row & run Model 1 (Base Susceptibility).
        2. Fetch environmental observations from providers.
        3. Build dynamic feature vector & run Model 2 (Dynamic Risk).
        4. Assemble contract-compliant JSON response.
        """
        # 1. Model 1 — Base Susceptibility
        if static_override:
            static_df = LiveFeatureBuilder.build_static_feature_row(
                latitude=latitude,
                longitude=longitude,
                **static_override
            )
        else:
            static_df = LiveFeatureBuilder.build_static_feature_row(
                latitude=latitude,
                longitude=longitude
            )

        susc_res = self.inference_engine.predict_base_susceptibility(static_df)[0]

        # 2. Fetch observations
        if self.use_mock_providers:
            obs = await self.mock_provider.fetch(latitude, longitude)
        else:
            gpm_obs = await self.gpm_provider.fetch(latitude, longitude)
            imd_obs = await self.imd_provider.fetch(latitude, longitude)
            smap_obs = await self.smap_provider.fetch(latitude, longitude)
            obs = {**gpm_obs, **imd_obs, **smap_obs}

        # 3. Model 2 — Dynamic Risk
        dynamic_df = LiveFeatureBuilder.build_dynamic_feature_row(
            base_susceptibility=susc_res["base_susceptibility"],
            provider_observations=obs
        )

        risk_res = self.inference_engine.predict_dynamic_risk(dynamic_df)[0]

        # 4. Construct Risk Response Contract
        timestamp_now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        response = {
            "prediction_id": f"PRD_{int(datetime.datetime.now().timestamp()*1000)}",
            "location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "timestamp": timestamp_now,
            "base_susceptibility": {
                "score": susc_res["base_susceptibility"],
                "level": susc_res["susceptibility_level"],
                "raw_probability": susc_res["base_susceptibility_raw"]
            },
            "dynamic_risk": {
                "current_risk": risk_res["current_risk"],
                "current_risk_level": risk_res["current_risk_level"],
                "risk_24h": risk_res["risk_24h"],
                "risk_24h_level": risk_res["risk_24h_level"],
                "horizons": risk_res["horizons_supported"]
            },
            "environmental_observations": {
                "rainfall_24h_mm": obs.get("rainfall_24h_mm"),
                "soil_moisture": obs.get("soil_moisture"),
                "forecast_rain_24h_mm": obs.get("forecast_rain_24h_mm"),
                "data_quality": obs.get("quality", "GOOD"),
                "stale": obs.get("stale", False)
            },
            "metadata": {
                "model_version_susceptibility": susc_res["model_version"],
                "model_version_dynamic_risk": risk_res["model_version"],
                "status": "VALIDATED"
            }
        }
        return response
