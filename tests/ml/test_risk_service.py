"""
test_risk_service.py
--------------------
Integration test for RiskAssessmentService API contract compliance.
"""

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT))

from backend.app.risk.service import RiskAssessmentService


def test_risk_service_integration():
    service = RiskAssessmentService(use_mock_providers=True)
    response = asyncio.run(service.assess_point_risk(latitude=25.57, longitude=91.88))

    assert "prediction_id" in response
    assert "base_susceptibility" in response
    assert 0 <= response["base_susceptibility"]["score"] <= 100
    assert "dynamic_risk" in response
    assert 0 <= response["dynamic_risk"]["current_risk"] <= 100
    assert 0 <= response["dynamic_risk"]["risk_24h"] <= 100
    assert response["dynamic_risk"]["horizons"]["6h"]["validated"] is False

    print("test_risk_service_integration: PASSED")


if __name__ == "__main__":
    test_risk_service_integration()
