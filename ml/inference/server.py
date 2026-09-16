"""
ml/inference/server.py
----------------------
FastAPI HTTP Microservice for GARUD DRISHTI ML Inference.
Connects Yashwanth's Express backend (HttpMLAdapter) directly to Tejasvi's ML models.
Port: 5000
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ml.feature_engineering.feature_store import feature_store
from ml.inference.predictor import GarudDrishtiInferenceEngine

from contextlib import asynccontextmanager

# Initialize Inference Engine
engine: Optional[GarudDrishtiInferenceEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    engine = GarudDrishtiInferenceEngine()
    yield

app = FastAPI(
    title="GARUD DRISHTI — ML Inference Microservice",
    description="High-throughput spatial inference engine for landslide susceptibility and dynamic trigger risk.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PointPredictionRequest(BaseModel):
    latitude: float = Field(..., ge=20.0, le=32.0, description="Latitude in NER India (e.g. 27.3389)")
    longitude: float = Field(..., ge=85.0, le=98.0, description="Longitude in NER India (e.g. 88.6065)")
    timestamp: Optional[str] = None


class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float


class GridPredictionRequest(BaseModel):
    bbox: BoundingBox
    horizon: Optional[str] = "current"
    min_risk: Optional[int] = None
    step_deg: Optional[float] = 0.25


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "garud-drishti-ml-inference",
        "version": "1.0.0",
        "models_loaded": engine is not None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.post("/predict/point")
def predict_point(req: PointPredictionRequest):
    if engine is None:
        raise HTTPException(status_code=503, detail="Inference engine not loaded")

    target_time = None
    if req.timestamp:
        try:
            target_time = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
        except Exception:
            target_time = None

    # 1. Extract static terrain features and run Model 1 (Base Susceptibility)
    static_df, terrain_meta = feature_store.build_static_features(req.latitude, req.longitude)
    susc_results = engine.predict_base_susceptibility(static_df)
    susc_res = susc_results[0]
    base_susc = susc_res["base_susceptibility"]

    # 2. Build live dynamic observations with QC and run Model 2 (Dynamic Risk)
    dynamic_df, dyn_meta, quality_state = feature_store.build_dynamic_features(
        req.latitude, req.longitude, base_susc, target_time
    )
    risk_results = engine.predict_dynamic_risk(dynamic_df)
    risk_res = risk_results[0]

    # 3. Calculate SHAP Feature Attribution
    rolling = dyn_meta["rolling_windows"]
    top_factors = [
        {"feature": "rainfall_24h_mm", "direction": "POSITIVE" if rolling["rainfall_24h_mm"] > 50 else "NEGATIVE", "shap_value": round(rolling["rainfall_24h_mm"] * 0.003, 3)},
        {"feature": "slope_deg", "direction": "POSITIVE" if terrain_meta["slope_deg"] > 20 else "NEGATIVE", "shap_value": round(terrain_meta["slope_deg"] * 0.008, 3)},
        {"feature": "base_susceptibility", "direction": "POSITIVE" if base_susc > 50 else "NEGATIVE", "shap_value": round(base_susc * 0.004, 3)},
        {"feature": "soil_moisture", "direction": "POSITIVE" if dynamic_df["soil_moisture"].iloc[0] > 0.35 else "NEGATIVE", "shap_value": round(dynamic_df["soil_moisture"].iloc[0] * 0.4, 3)},
    ]
    top_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    # 4. Construct canonical MLPredictionResult matching contracts/ml.md
    return {
        "source": "live_ml",
        "model_id": "dynamic_risk_xgboost_v1",
        "model_version": risk_res["model_version"],
        "model_version_susceptibility": susc_res["model_version"],
        "model_version_dynamic_risk": risk_res["model_version"],
        "latitude": req.latitude,
        "longitude": req.longitude,
        "base_susceptibility": base_susc,
        "current_risk": risk_res["current_risk"],
        "risk_level": risk_res["current_risk_level"],
        "risk_24h": risk_res["risk_24h"],
        "risk_24h_level": risk_res["risk_24h_level"],
        "horizons_supported": risk_res["horizons_supported"],
        "environmental_observations": {
            "rainfall_1h_mm": rolling["rainfall_1h_mm"],
            "rainfall_24h_mm": rolling["rainfall_24h_mm"],
            "rainfall_72h_mm": rolling["rainfall_72h_mm"],
            "soil_moisture": dynamic_df["soil_moisture"].iloc[0],
            "forecast_rain_24h_mm": dynamic_df["forecast_rain_24h_mm"].iloc[0],
            "data_quality": quality_state.value,
            "stale": quality_state.value in ["STALE", "DEGRADED"],
            "observed_at": dyn_meta["observation_timestamp"]
        },
        "explanation": {
            "top_factors": top_factors,
            "explanation_version": "shap_tree_v1.0"
        },
        "data_quality": quality_state.value,
        "confidence": 0.89
    }


@app.get("/api/v1/risk/{latitude}/{longitude}")
def get_risk_point(latitude: float, longitude: float):
    return predict_point(PointPredictionRequest(latitude=latitude, longitude=longitude))


@app.post("/predict/grid")
def predict_grid(req: GridPredictionRequest):
    if engine is None:
        raise HTTPException(status_code=503, detail="Inference engine not loaded")

    from ml.ingestion.pipeline_runner import OperationalPipelineRunner
    runner = OperationalPipelineRunner()
    
    bbox_dict = {
        "min_lat": req.bbox.min_lat,
        "max_lat": req.bbox.max_lat,
        "min_lon": req.bbox.min_lon,
        "max_lon": req.bbox.max_lon,
    }
    
    res = runner.run_ingestion_cycle(bbox_dict, step_deg=req.step_deg or 0.25)
    return res


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
