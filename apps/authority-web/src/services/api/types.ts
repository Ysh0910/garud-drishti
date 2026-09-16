/**
 * DTOs mirroring the REAL backend response shapes (backend/src/services + contracts/*.md),
 * not our UI view-models. Keep these in lockstep with the backend; if a backend shape
 * changes, this is the one file that needs updating — components never see these directly,
 * only the mapped view-models in ../../types/zone.ts.
 */
import type { DataQuality, ReportCategory, ReportStatus, RiskLevel, RiskState, Trend } from '../../types/enums';

export interface RiskZoneFeatureDto {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  properties: {
    cell_id: string;
    base_susceptibility: number;
    risk_score: number;
    risk_level: RiskLevel;
    risk_state: RiskState;
    response_priority: string | null;
    trend: Trend;
    confidence: number | null;
    data_quality: DataQuality;
    updated_at: string;
    model_version: string;
  };
}

export interface RiskGridResponseDto {
  type: 'FeatureCollection';
  features: RiskZoneFeatureDto[];
  meta: { horizon: string; generated_at: string; total_cells: number; model_version: string };
}

export interface ShapFactorDto {
  feature: string;
  direction: 'POSITIVE' | 'NEGATIVE';
  shap_value: number;
}

export interface RiskZoneDetailDto {
  cell_id: string;
  base_susceptibility: number;
  current_risk: number;
  risk_level: RiskLevel;
  risk_state: RiskState;
  response_priority: string | null;
  trend: Trend;
  confidence: number | null;
  data_quality: DataQuality;
  updated_at: string;
  model_version: string;
  forecasts: Array<{ horizon: string; risk_score: number; risk_level: RiskLevel; validated: boolean }>;
  explanation: { top_factors: ShapFactorDto[]; explanation_version: string } | null;
}

export interface DashboardSummaryDto {
  kpi: {
    critical_zones: number;
    high_risk_zones: number;
    active_alerts: number;
    new_reports: number;
    roads_at_risk: number;
    villages_at_risk: number;
    unresolved_incidents: number;
  };
  data_freshness: {
    risk_grid_updated_at: string | null;
    rainfall_updated_at: string | null;
    overall_quality: DataQuality;
  };
  generated_at: string;
}

/** Mirrors backend/src/services/alertService.ts AlertResponse exactly. */
export interface AlertDto {
  alert_id: string;
  cell_id: string | null;
  zone_name: string | null;
  severity: RiskLevel;
  state: 'CREATED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ESCALATED' | 'RESOLVED';
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  resolved_at: string | null;
}

/** Mirrors backend/src/services/reportService.ts ReportResponse exactly. */
export interface ReportDto {
  report_id: string;
  status: ReportStatus;
  category: ReportCategory;
  description: string | null;
  latitude: number;
  longitude: number;
  captured_at: string;
  submitted_at: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  nearest_cell_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
}

/** Mirrors backend/src/schemas/report.ts verifyReportSchema — note there is no
 * FOLLOW_UP action on the real API; our UI's "Follow-up" maps to MARK_PROBABLE. */
export type ReportVerifyAction = 'VERIFY' | 'REJECT' | 'MARK_PROBABLE';

/** Mirrors backend/src/services/prioritizationService.ts PrioritizationInput exactly. */
export interface PrioritizationInputDto {
  hazard_score: number;
  trend?: Trend;
  population?: number | null;
  nearby_villages_count?: number;
  has_national_highway?: boolean;
  has_state_highway?: boolean;
  critical_facilities_count?: number;
  has_hospital?: boolean;
  has_school_or_shelter?: boolean;
  has_power_or_comm?: boolean;
  verified_reports_count?: number;
  data_quality?: DataQuality;
}

export interface PrioritizationWeightsDto {
  hazard_weight: number;
  exposure_weight: number;
  infrastructure_weight: number;
  connectivity_weight: number;
}

export interface PrioritizationResultDto {
  priority_score: number;
  response_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE';
  priority_reasons: string[];
  breakdown: {
    hazard_subscore: number;
    exposure_subscore: number;
    infrastructure_subscore: number;
    connectivity_subscore: number;
    weights_applied: PrioritizationWeightsDto;
  };
}
