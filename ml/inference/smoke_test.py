"""
smoke_test.py
-------------
Phase 5: Inference Smoke Test Suite.
Verifies loading model artifacts from disk, checking prediction ranges,
determinism (identical output for identical inputs), and contract schema compliance.
"""

import logging
from pathlib import Path
import sys
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT))

from ml.inference.predictor import GarudDrishtiInferenceEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("inference_smoke_test")


def run_smoke_test():
    logger.info("--- Starting Inference Engine Smoke Test ---")
    engine = GarudDrishtiInferenceEngine()

    # 1. Test Model 1 Base Susceptibility Inference
    sample_static = pd.DataFrame([{
        "elevation_m": 450.0,
        "slope_deg": 28.5,
        "aspect_deg": 180.0,
        "curvature": 0.002,
        "landcover": "Tree Cover / Dense Forest",
        "geology": "Mountain Litho-Soil Complex",
        "geomorphology": "Dissected Hill Slope",
        "hydrological_condition": "Neutral Planar Drainage",
        "distance_to_drainage_m": 250.0,
        "historical_ls_density": 0.15,
        "distance_to_historical_ls_m": 850.0
    }])

    res_susc_1 = engine.predict_base_susceptibility(sample_static)
    res_susc_2 = engine.predict_base_susceptibility(sample_static)

    assert len(res_susc_1) == 1, "Expected 1 prediction result"
    assert res_susc_1[0]["base_susceptibility"] == res_susc_2[0]["base_susceptibility"], "Inference must be deterministic!"
    assert 0 <= res_susc_1[0]["base_susceptibility"] <= 100, "Base susceptibility must be in 0-100 range"
    logger.info(f"Model 1 Smoke Test PASSED: base_susceptibility = {res_susc_1[0]['base_susceptibility']} ({res_susc_1[0]['susceptibility_level']})")

    # 2. Test Model 2 Dynamic Risk Inference
    sample_dynamic = pd.DataFrame([{
        "base_susceptibility": res_susc_1[0]["base_susceptibility"],
        "rainfall_1h_mm": 12.5,
        "rainfall_3h_mm": 35.0,
        "rainfall_6h_mm": 65.0,
        "rainfall_12h_mm": 95.0,
        "rainfall_24h_mm": 140.0,
        "rainfall_72h_mm": 220.0,
        "rainfall_7d_mm": 310.0,
        "soil_moisture": 0.42,
        "forecast_rain_6h_mm": 25.0,
        "forecast_rain_24h_mm": 70.0,
        "forecast_rain_48h_mm": 110.0
    }])

    res_risk_1 = engine.predict_dynamic_risk(sample_dynamic)
    res_risk_2 = engine.predict_dynamic_risk(sample_dynamic)

    assert len(res_risk_1) == 1
    assert res_risk_1[0]["current_risk"] == res_risk_2[0]["current_risk"], "Model 2 Current Risk inference must be deterministic!"
    assert res_risk_1[0]["risk_24h"] == res_risk_2[0]["risk_24h"], "Model 2 24h Risk inference must be deterministic!"
    assert 0 <= res_risk_1[0]["current_risk"] <= 100
    assert 0 <= res_risk_1[0]["risk_24h"] <= 100

    assert res_risk_1[0]["horizons_supported"]["6h"]["validated"] is False, "6h horizon must be marked validated=False"

    logger.info(f"Model 2 Smoke Test PASSED: current_risk = {res_risk_1[0]['current_risk']} ({res_risk_1[0]['current_risk_level']}), risk_24h = {res_risk_1[0]['risk_24h']} ({res_risk_1[0]['risk_24h_level']})")
    logger.info("ALL INFERENCE SMOKE TESTS PASSED SUCCESSFULLY!")
    return True


if __name__ == "__main__":
    run_smoke_test()
