"""
backend/app/api/v1/router.py
----------------------------
FastAPI API v1 Router defining endpoints for Environmental Risk,
Citizen Hazard Reports, AI Analysis, and Authority Reviews.
"""

from datetime import datetime, timezone
import sys
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

# Ensure root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[4]
BACKEND_DIR = Path(__file__).resolve().parents[3]
for p in [str(PROJECT_ROOT), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.reports.models import (
        ReportResponse,
        ReportListResponse,
        ReportSubmissionResponse,
        CitizenReportAnalysisResponse,
        AuthorityReviewRequest,
        AuthorityVerifyRequest,
        AuthorityReviewResponse,
        BatchClusterAnalyzeRequest,
    )
    from app.reports.service import report_service
except ImportError:
    from backend.app.reports.models import (
        ReportResponse,
        ReportListResponse,
        ReportSubmissionResponse,
        CitizenReportAnalysisResponse,
        AuthorityReviewRequest,
        AuthorityVerifyRequest,
        AuthorityReviewResponse,
        BatchClusterAnalyzeRequest,
    )
    from backend.app.reports.service import report_service

api_router = APIRouter()


@api_router.get("/risk/{latitude}/{longitude}")
async def get_point_risk(latitude: float, longitude: float):
    """
    Environmental risk prediction endpoint (Model 1 + Model 2).
    """
    return {
        "latitude": latitude,
        "longitude": longitude,
        "base_susceptibility": 45.0,
        "current_risk": 78,
        "risk_level": "HIGH",
        "risk_6h": 82,
        "risk_24h": 88,
        "risk_48h": 75,
        "risk_72h": 60,
    }


# ============================================================================
# Citizen Reports Endpoints (contract & section 23 compatibility)
# ============================================================================

async def _handle_report_submission(
    category: str,
    latitude: float,
    longitude: float,
    captured_at: Optional[str] = None,
    client_report_id: Optional[str] = None,
    user_id: Optional[str] = None,
    description: Optional[str] = None,
    severity: Optional[str] = None,
    location_accuracy_m: Optional[float] = None,
    photo: Optional[UploadFile] = None,
):
    if captured_at:
        try:
            cap_dt = datetime.fromisoformat(captured_at.replace("Z", "+00:00"))
        except Exception:
            cap_dt = datetime.now(timezone.utc)
    else:
        cap_dt = datetime.now(timezone.utc)

    photo_bytes = None
    if photo:
        photo_bytes = await photo.read()

    record = report_service.submit_report(
        category=category,
        latitude=latitude,
        longitude=longitude,
        captured_at=cap_dt,
        client_report_id=client_report_id,
        user_id=user_id,
        description=description,
        severity=severity,
        location_accuracy_m=location_accuracy_m,
        photo_bytes=photo_bytes,
    )

    return record


@api_router.post("/citizen/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_citizen_report(
    category: str = Form("LANDSLIDE"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    captured_at: Optional[str] = Form(None),
    client_report_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    severity: Optional[str] = Form("MEDIUM"),
    location_accuracy_m: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    """
    Submits a citizen report with optional photographic evidence.
    Triggers automated Vision AI, authenticity, credibility, and impact analysis.
    """
    return await _handle_report_submission(
        category=category,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
        client_report_id=client_report_id,
        user_id=user_id,
        description=description,
        severity=severity,
        location_accuracy_m=location_accuracy_m,
        photo=photo,
    )


@api_router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report_alias(
    category: str = Form("LANDSLIDE"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    captured_at: Optional[str] = Form(None),
    client_report_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    severity: Optional[str] = Form("MEDIUM"),
    location_accuracy_m: Optional[float] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    """Contract alias for /reports."""
    return await _handle_report_submission(
        category=category,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_at,
        client_report_id=client_report_id,
        user_id=user_id,
        description=description,
        severity=severity,
        location_accuracy_m=location_accuracy_m,
        photo=photo,
    )


@api_router.get("/citizen/reports", response_model=ReportListResponse)
async def list_citizen_reports(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """Lists citizen reports with pagination per contract."""
    return report_service.list_reports(status=status, category=category, limit=limit, offset=offset)


@api_router.get("/reports", response_model=ReportListResponse)
async def list_reports_alias(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
):
    """Contract alias for listing reports."""
    return report_service.list_reports(status=status, category=category, limit=limit, offset=offset)


@api_router.get("/citizen/reports/{report_id}", response_model=ReportResponse)
async def get_citizen_report(report_id: str):
    """Retrieves report metadata by ID."""
    rep = report_service.get_report(report_id)
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return rep


@api_router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report_alias(report_id: str):
    """Contract alias for getting report by ID."""
    rep = report_service.get_report(report_id)
    if not rep:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return rep


@api_router.get("/citizen/reports/{report_id}/analysis", response_model=CitizenReportAnalysisResponse)
async def get_report_analysis(report_id: str):
    """
    Retrieves full explainable multi-score AI intelligence analysis for a report.
    Returns environmental risk, visual confidence, credibility, impact, exposure, and priority.
    """
    analysis = report_service.get_analysis(report_id)
    if not analysis:
        rep = report_service.get_report(report_id)
        if not rep:
            raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
        raise HTTPException(status_code=400, detail="No visual AI analysis available for this report (no photo submitted).")
    return analysis


@api_router.post("/authority/reports/{report_id}/review", response_model=AuthorityReviewResponse)
async def review_report(report_id: str, review: AuthorityReviewRequest):
    """
    Authority Decision Gate: APPROVE, REJECT, REQUEST_MORE_EVIDENCE, or HOLD.
    Maintains human-in-the-loop control before any public alert activation.
    """
    res = report_service.review_report(
        report_id=report_id,
        decision=review.decision,
        reviewer_id=review.reviewer_id,
        rejection_reason=review.rejection_reason,
        notes=review.notes,
    )
    if not res:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return res


@api_router.post("/reports/{report_id}/verify", response_model=ReportResponse)
async def verify_report_contract_endpoint(report_id: str, req: AuthorityVerifyRequest):
    """Contract endpoint for authority verification."""
    res = report_service.verify_report_contract(
        report_id=report_id,
        action=req.action,
        rejection_reason=req.rejection_reason,
    )
    if not res:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return res


@api_router.post("/citizen/reports/batch-analyze")
async def batch_cluster_analyze(request: BatchClusterAnalyzeRequest):
    """
    Runs coordinated fraud cluster analysis on a batch of recent report submissions.
    """
    return report_service.analyze_cluster(
        cluster_id=request.cluster_id,
        report_ids=request.report_ids,
    )
