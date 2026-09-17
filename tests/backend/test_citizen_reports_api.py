"""
tests/backend/test_citizen_reports_api.py
-----------------------------------------
Integration tests for Citizen Reports and Authority Review FastAPI endpoints.
"""

from datetime import datetime, timezone
import io
from pathlib import Path
import sys
import numpy as np
from PIL import Image
import pytest
from fastapi.testclient import TestClient

# Ensure backend and root are on sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
for p in [str(PROJECT_ROOT), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app

client = TestClient(app)


def make_test_jpeg(width=300, height=300, color=(150, 110, 70)) -> bytes:
    arr = np.full((height, width, 3), color, dtype=np.uint8)
    noise = np.random.randint(-20, 20, (height, width, 3), dtype=np.int16)
    arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_citizen_report_with_photo():
    jpeg_bytes = make_test_jpeg()
    files = {"photo": ("landslide.jpg", jpeg_bytes, "image/jpeg")}
    data = {
        "category": "LANDSLIDE",
        "latitude": "27.3500",
        "longitude": "92.6500",
        "description": "Large debris blocking mountain road",
        "severity": "HIGH",
        "client_report_id": "test-uuid-client-123",
    }

    response = client.post("/api/v1/citizen/reports", data=data, files=files)
    assert response.status_code == 201
    resp_data = response.json()

    assert "report_id" in resp_data
    assert resp_data["client_report_id"] == "test-uuid-client-123"
    assert resp_data["category"] == "LANDSLIDE"
    assert resp_data["latitude"] == 27.3500
    assert resp_data["longitude"] == 92.6500
    assert resp_data["media_url"] is not None
    assert resp_data["evidence_score"] is not None
    assert resp_data["status"] in ("AUTHORITY_REVIEW", "NEEDS_EVIDENCE")


def test_report_idempotency_deduplication():
    jpeg_bytes = make_test_jpeg()
    data = {
        "category": "ROAD_BLOCKAGE",
        "latitude": "26.8500",
        "longitude": "91.9500",
        "client_report_id": "dedup-unique-id-999",
    }
    files = {"photo": ("shot.jpg", jpeg_bytes, "image/jpeg")}

    resp1 = client.post("/api/v1/citizen/reports", data=data, files=files)
    assert resp1.status_code == 201
    rep_id_1 = resp1.json()["report_id"]

    # Resubmit identical client_report_id
    resp2 = client.post("/api/v1/citizen/reports", data=data, files=files)
    assert resp2.status_code == 201
    rep_id_2 = resp2.json()["report_id"]

    # Must return the same report ID without duplicating
    assert rep_id_1 == rep_id_2


def test_get_report_and_analysis_endpoint():
    jpeg_bytes = make_test_jpeg()
    files = {"photo": ("debris.jpg", jpeg_bytes, "image/jpeg")}
    data = {
        "category": "LANDSLIDE",
        "latitude": "27.2000",
        "longitude": "92.4000",
        "description": "Mud and rocks covering highway lane",
    }
    create_resp = client.post("/api/v1/citizen/reports", data=data, files=files)
    report_id = create_resp.json()["report_id"]

    # 1. Get Report Details
    get_resp = client.get(f"/api/v1/citizen/reports/{report_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["report_id"] == report_id

    # 2. Get AI Analysis Details
    analysis_resp = client.get(f"/api/v1/citizen/reports/{report_id}/analysis")
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()

    assert analysis["report_id"] == report_id
    assert "response_priority" in analysis
    assert "credibility" in analysis
    assert "environmental_risk" in analysis
    assert "observed_impact" in analysis
    assert "exposure" in analysis
    assert "priority_level" in analysis
    assert "recommended_action" in analysis
    assert len(analysis["decision_path"]) > 0


def test_authority_review_approve():
    jpeg_bytes = make_test_jpeg()
    files = {"photo": ("ls.jpg", jpeg_bytes, "image/jpeg")}
    data = {"category": "LANDSLIDE", "latitude": "27.1000", "longitude": "92.3000"}
    create_resp = client.post("/api/v1/citizen/reports", data=data, files=files)
    report_id = create_resp.json()["report_id"]

    # Review: APPROVE
    review_data = {
        "decision": "APPROVE",
        "reviewer_id": "officer-ner-01",
        "notes": "Verified by field team",
    }
    review_resp = client.post(f"/api/v1/authority/reports/{report_id}/review", json=review_data)
    assert review_resp.status_code == 200
    review_result = review_resp.json()
    assert review_result["status"] == "VERIFIED"
    assert review_result["verified_by"] == "officer-ner-01"

    # Confirm status in report retrieval
    get_resp = client.get(f"/api/v1/citizen/reports/{report_id}")
    assert get_resp.json()["status"] == "VERIFIED"
    assert get_resp.json()["verified_by"] == "officer-ner-01"


def test_authority_review_reject():
    jpeg_bytes = make_test_jpeg()
    files = {"photo": ("ls.jpg", jpeg_bytes, "image/jpeg")}
    data = {"category": "LANDSLIDE", "latitude": "27.1000", "longitude": "92.3000"}
    create_resp = client.post("/api/v1/citizen/reports", data=data, files=files)
    report_id = create_resp.json()["report_id"]

    # Review: REJECT
    review_data = {
        "decision": "REJECT",
        "reviewer_id": "officer-ner-02",
        "rejection_reason": "Old photo of roadwork, not landslide",
    }
    review_resp = client.post(f"/api/v1/authority/reports/{report_id}/review", json=review_data)
    assert review_resp.status_code == 200
    review_result = review_resp.json()
    assert review_result["status"] == "REJECTED"

    get_resp = client.get(f"/api/v1/citizen/reports/{report_id}")
    assert get_resp.json()["status"] == "REJECTED"
    assert get_resp.json()["rejection_reason"] == "Old photo of roadwork, not landslide"
