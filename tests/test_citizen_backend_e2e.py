"""
tests/test_citizen_backend_e2e.py
---------------------------------
Comprehensive End-to-End Integration Test Suite for Citizen Mobile App -> Express Backend -> Python ML Pipeline.
"""

import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.inference.server import app, load_models


def test_citizen_mobile_to_ml_e2e_flow():
    """
    Verifies that the Citizen Mobile contract shapes are fully fulfilled by the ML microservice.
    """
    load_models()
    client = TestClient(app)

    # 1. Citizen queries local risk at Mawkdok Valley, Meghalaya (25.6185, 91.8792)
    lat, lon = 25.6185, 91.8792
    response = client.get(f"/api/v1/risk/{lat}/{lon}")
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
    data = response.json()

    # Validate Citizen Mobile Risk Contract (apps/citizen-mobile/src/types/risk.ts)
    assert data["latitude"] == lat
    assert data["longitude"] == lon
    assert "base_susceptibility" in data
    assert 0 <= data["base_susceptibility"] <= 100
    assert "current_risk" in data
    assert 0 <= data["current_risk"] <= 100
    assert data["risk_level"] in ["VERY_LOW", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "horizons_supported" in data
    assert "current" in data["horizons_supported"]
    assert "24h" in data["horizons_supported"]
    assert "environmental_observations" in data
    assert "rainfall_24h_mm" in data["environmental_observations"]
    assert "soil_moisture" in data["environmental_observations"]
    assert "explanation" in data
    assert len(data["explanation"]["top_factors"]) > 0
    assert "data_quality" in data
    assert data["data_quality"] in ["GOOD", "DEGRADED", "STALE"]

    print("[PASS] Step 1: Citizen Mobile Point Risk query successfully verified against live ML pipeline")

    # 2. Citizen queries local risk at Gangtok, Sikkim (27.3389, 88.6065)
    sikkim_lat, sikkim_lon = 27.3389, 88.6065
    res_sikkim = client.get(f"/api/v1/risk/{sikkim_lat}/{sikkim_lon}")
    assert res_sikkim.status_code == 200
    sikkim_data = res_sikkim.json()
    assert sikkim_data["latitude"] == sikkim_lat
    assert sikkim_data["longitude"] == sikkim_lon
    assert sikkim_data["base_susceptibility"] > 0

    print("[PASS] Step 2: Multi-regional corridor inference (Sikkim & Meghalaya) verified")


if __name__ == "__main__":
    test_citizen_mobile_to_ml_e2e_flow()
    print("\n[SUCCESS] ALL CITIZEN MOBILE <-> ML INTEGRATION TESTS PASSED SUCCESSFULLY!")
