"""
backend/app/reports/models.py
-----------------------------
Pydantic data models and schemas for Citizen Reports and Authority Review.
Adheres to contracts/reports.md and GARUD_DRISHTI_Citizen_AI_Architecture.md.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ReportCategory(str, Enum):
    LANDSLIDE = "LANDSLIDE"
    ROCKFALL = "ROCKFALL"
    ROAD_BLOCKAGE = "ROAD_BLOCKAGE"
    CRACKS = "CRACKS"
    FLOODING = "FLOODING"
    MUD_FLOW = "MUD_FLOW"
    OTHER = "OTHER"


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    AI_ANALYSIS = "AI_ANALYSIS"
    CREDIBLE = "CREDIBLE"
    SUSPICIOUS = "SUSPICIOUS"
    NEEDS_EVIDENCE = "NEEDS_EVIDENCE"
    QUARANTINE = "QUARANTINE"
    IMPACT_ANALYSIS = "IMPACT_ANALYSIS"
    AUTHORITY_REVIEW = "AUTHORITY_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    HOLD = "HOLD"


class ReviewDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    REQUEST_MORE_EVIDENCE = "REQUEST_MORE_EVIDENCE"
    HOLD = "HOLD"


class ReportSubmissionResponse(BaseModel):
    report_id: str
    client_report_id: Optional[str] = None
    status: str
    message: str
    submitted_at: datetime


class ReportResponse(BaseModel):
    report_id: str
    client_report_id: Optional[str] = None
    status: ReportStatus
    category: ReportCategory
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_accuracy_m: Optional[float] = None
    captured_at: datetime
    submitted_at: datetime
    severity: Optional[str] = None
    media_url: Optional[str] = None
    evidence_score: Optional[float] = None
    nearest_cell_id: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None


class CitizenReportAnalysisResponse(BaseModel):
    report_id: str
    status: str
    environmental_risk: float
    image_confidence: float
    credibility: float
    observed_impact: float
    exposure: float
    response_priority: float
    coordination_risk: float
    priority_level: str
    recommended_action: str
    landslide_detected: bool
    road_blockage_detected: bool
    debris_detected: bool
    visible_affected_fraction: float
    audit_positive_signals: List[str]
    audit_risk_flags: List[str]
    decision_path: List[str]


class AuthorityReviewRequest(BaseModel):
    decision: ReviewDecision
    reviewer_id: str = "authority-officer-1"
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None


class AuthorityReviewResponse(BaseModel):
    report_id: str
    status: str
    decision: ReviewDecision
    verified_by: str
    verified_at: datetime
    message: str


class BatchClusterAnalyzeRequest(BaseModel):
    cluster_id: str
    report_ids: List[str]
