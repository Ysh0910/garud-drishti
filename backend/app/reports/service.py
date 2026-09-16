"""
backend/app/reports/service.py
------------------------------
Report storage and AI analysis service for Citizen Intelligence.
Enforces all contracts, deduplication, async/sync AI processing, and authority review gates.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import uuid

from backend.app.reports.models import (
    ReportCategory,
    ReportStatus,
    ReportResponse,
    CitizenReportAnalysisResponse,
    ReviewDecision,
    AuthorityReviewResponse,
)
from ml.vision.pipeline import CitizenAIPipeline, FullCitizenAnalysisResult
from ml.vision.coordination import CoordinatedFraudDetector, ReportClusterItem


class ReportService:
    """
    In-memory / repository service for citizen report lifecycle and AI processing.
    """

    def __init__(self):
        self._reports: Dict[str, Dict[str, Any]] = {}
        self._analyses: Dict[str, FullCitizenAnalysisResult] = {}
        self._pipeline = CitizenAIPipeline()
        self._fraud_detector = CoordinatedFraudDetector()
        self._client_id_map: Dict[str, str] = {}
        self._known_phashes: List[str] = []

    def submit_report(
        self,
        category: str,
        latitude: float,
        longitude: float,
        captured_at: datetime,
        client_report_id: Optional[str] = None,
        user_id: Optional[str] = None,
        description: Optional[str] = None,
        severity: Optional[str] = None,
        location_accuracy_m: Optional[float] = None,
        photo_bytes: Optional[bytes] = None,
        environmental_risk_score: float = 65.0,
        base_susceptibility: float = 55.0,
    ) -> Dict[str, Any]:
        """
        Creates a new hazard report and triggers AI analysis pipeline.
        Deduplicates on client_report_id if provided.
        """
        if client_report_id and client_report_id in self._client_id_map:
            existing_id = self._client_id_map[client_report_id]
            return self._reports[existing_id]

        report_id = str(uuid.uuid4())
        submitted_at = datetime.now(timezone.utc)

        # Map category safely
        try:
            cat_enum = ReportCategory(category.upper())
        except ValueError:
            cat_enum = ReportCategory.LANDSLIDE

        # Default media url if photo present
        media_url = f"/static/reports/{report_id}.jpg" if photo_bytes else None

        # Execute Citizen AI Pipeline
        if photo_bytes:
            analysis_result = self._pipeline.process_report(
                report_id=report_id,
                image_bytes=photo_bytes,
                latitude=latitude,
                longitude=longitude,
                captured_at=captured_at,
                submitted_at=submitted_at,
                user_id=user_id,
                description=description,
                existing_hashes=self._known_phashes,
                environmental_risk_score=environmental_risk_score,
                base_susceptibility=base_susceptibility,
            )
            self._analyses[report_id] = analysis_result
            if analysis_result.phash:
                self._known_phashes.append(analysis_result.phash)

            # Map status from AI
            status_val = analysis_result.status
            evidence_score = round(analysis_result.report_credibility_score / 100.0, 2)
        else:
            # No photo uploaded
            status_val = "PENDING"
            evidence_score = 0.30

        report_record = {
            "report_id": report_id,
            "client_report_id": client_report_id,
            "user_id": user_id or "anonymous-citizen",
            "status": status_val,
            "category": cat_enum.value,
            "description": description,
            "latitude": latitude,
            "longitude": longitude,
            "location_accuracy_m": location_accuracy_m,
            "captured_at": captured_at,
            "submitted_at": submitted_at,
            "severity": severity or "MEDIUM",
            "media_url": media_url,
            "evidence_score": evidence_score,
            "nearest_cell_id": f"cell_{int(latitude*100)}_{int(longitude*100)}",
            "verified_by": None,
            "verified_at": None,
            "rejection_reason": None,
        }

        self._reports[report_id] = report_record
        if client_report_id:
            self._client_id_map[client_report_id] = report_id

        return report_record

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        return self._reports.get(report_id)

    def list_reports(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        results = list(self._reports.values())
        if status:
            results = [r for r in results if r["status"].upper() == status.upper()]
        if category:
            results = [r for r in results if r["category"].upper() == category.upper()]
        return results[offset : offset + limit]

    def get_analysis(self, report_id: str) -> Optional[Dict[str, Any]]:
        analysis = self._analyses.get(report_id)
        if not analysis:
            return None
        return analysis.to_api_dict()

    def review_report(
        self,
        report_id: str,
        decision: ReviewDecision,
        reviewer_id: str,
        rejection_reason: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[AuthorityReviewResponse]:
        report = self._reports.get(report_id)
        if not report:
            return None

        now = datetime.now(timezone.utc)
        if decision == ReviewDecision.APPROVE:
            new_status = "VERIFIED"
            message = "Report approved and verified by authority."
        elif decision == ReviewDecision.REJECT:
            new_status = "REJECTED"
            message = f"Report rejected: {rejection_reason or 'Failed verification'}."
        elif decision == ReviewDecision.REQUEST_MORE_EVIDENCE:
            new_status = "NEEDS_EVIDENCE"
            message = "Requested additional photographic evidence from citizen."
        else:
            new_status = "HOLD"
            message = "Report placed on hold for field inspection."

        report["status"] = new_status
        report["verified_by"] = reviewer_id
        report["verified_at"] = now
        report["rejection_reason"] = rejection_reason

        return AuthorityReviewResponse(
            report_id=report_id,
            status=new_status,
            decision=decision,
            verified_by=reviewer_id,
            verified_at=now,
            message=message,
        )

    def analyze_cluster(self, cluster_id: str, report_ids: List[str]) -> Dict[str, Any]:
        """
        Executes coordinated fraud cluster analysis on given report IDs.
        """
        cluster_items: List[ReportClusterItem] = []
        for rid in report_ids:
            rep = self._reports.get(rid)
            analysis = self._analyses.get(rid)
            if rep and analysis:
                cluster_items.append(
                    ReportClusterItem(
                        report_id=rid,
                        user_id=rep.get("user_id", "user"),
                        latitude=rep["latitude"],
                        longitude=rep["longitude"],
                        submitted_at=rep["submitted_at"],
                        phash=analysis.phash,
                        image_quality_score=analysis.quality.image_quality_score,
                        landslide_confidence=analysis.classifier.confidence,
                        environmental_risk=analysis.environmental_risk_score,
                        description=rep.get("description"),
                    )
                )

        result = self._fraud_detector.analyze_cluster(cluster_id=cluster_id, reports=cluster_items)

        # If quarantined, update status of participating reports
        if result.is_quarantine_recommended:
            for rid in report_ids:
                if rid in self._reports and self._reports[rid]["status"] not in ("VERIFIED", "REJECTED"):
                    self._reports[rid]["status"] = "QUARANTINE"

        return {
            "cluster_id": result.cluster_id,
            "cluster_size": result.cluster_size,
            "coordination_risk_score": result.coordination_risk_score,
            "is_quarantine_recommended": result.is_quarantine_recommended,
            "verdict": result.verdict,
            "burst_score": result.burst_score,
            "visual_similarity_score": result.visual_similarity_score,
            "spatial_cluster_score": result.spatial_cluster_score,
            "independent_corroboration_score": result.independent_corroboration_score,
            "reasons": result.reasons,
        }


# Global singleton service instance
report_service = ReportService()
