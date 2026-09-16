import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from ml.inference.server import app, load_models
from ml.ingestion.pipeline_runner import OperationalPipelineRunner


def test_pipeline_runner_ingestion_cycle():
    runner = OperationalPipelineRunner()
    bbox = {"min_lat": 27.2, "max_lat": 27.5, "min_lon": 88.5, "max_lon": 88.7}
    res = runner.run_ingestion_cycle(bbox, step_deg=0.25)
    assert res["status"] == "success"
    assert res["cells_processed"] >= 1
    assert res["duration_seconds"] >= 0.0


def test_fastapi_inference_endpoints():
    load_models()
    client = TestClient(app)

    # 1. Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "ok"
    assert health_res.json()["models_loaded"] is True

    # 2. Point prediction for Gangtok, Sikkim (27.3389, 88.6065)
    point_payload = {
        "latitude": 27.3389,
        "longitude": 88.6065,
    }
    pred_res = client.post("/predict/point", json=point_payload)
    assert pred_res.status_code == 200
    data = pred_res.json()

    assert data["source"] == "live_ml"
    assert "model_version" in data
    assert 0 <= data["base_susceptibility"] <= 100
    assert 0 <= data["current_risk"] <= 100
    assert data["risk_level"] in ["VERY_LOW", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert data["risk_24h"] is not None
    assert "horizons_supported" in data
    assert data["horizons_supported"]["current"]["validated"] is True
    assert data["horizons_supported"]["24h"]["validated"] is True
    assert "environmental_observations" in data
    assert "rainfall_24h_mm" in data["environmental_observations"]
    assert "explanation" in data
    assert len(data["explanation"]["top_factors"]) > 0
    assert data["confidence"] > 0.0

    # 3. GET endpoint compatibility with backend mlAdapter
    get_res = client.get("/api/v1/risk/27.3389/88.6065")
    assert get_res.status_code == 200
    assert get_res.json()["source"] == "live_ml"


if __name__ == "__main__":
    test_pipeline_runner_ingestion_cycle()
    test_fastapi_inference_endpoints()
    print("All pipeline E2E tests passed successfully!")
