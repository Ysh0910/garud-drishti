import type { AlertState, DataQuality, ReportCategory, ReportStatus, ReportedSeverity, RiskLevel, Trend } from './enums';

/**
 * UI-facing zone summary as consumed by the triage worklist.
 * `risk_score` mirrors contracts/risk.md's RiskZoneFeature.risk_score (0-100 integer);
 * the console renders it as a 0-1 decimal to match the approved design, via formatScore01().
 */
export interface ZoneSummary {
  cell_id: string;
  label: string; // e.g. "Sohra · 4,820 exposed"
  district: string;
  state: string;
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  confidence: number | null; // 0-1, nullable per contracts/risk.md
  trend: Trend;
  trend_delta: number; // signed, 0-1 scale, matches the design's "▲.12" style deltas
  population_exposed: number;
  /** Prioritization exposure correlates — see services/api/prioritization.ts for how they're used. */
  exposureFactors: {
    nearby_villages_count: number;
    has_national_highway: boolean;
    has_state_highway: boolean;
    critical_facilities_count: number;
    has_hospital: boolean;
    has_school_or_shelter: boolean;
    has_power_or_comm: boolean;
  };
}

export interface ShapFactor {
  feature: string;
  /** signed contribution on the 0-1 score scale shown in the design */
  impact: number;
}

export interface WhyNowFactor extends ShapFactor {
  /** contribution since the previous model run, centered bidirectional bar */
  sincePreviousRun: number;
}

export interface ExposureSummary {
  population: number;
  households: number;
  road_segments: string; // e.g. "2 · NH-6, SH-12"
  critical_facilities: string; // e.g. "1 school · 1 PHC"
}

export interface CitizenEvidenceThumb {
  report_id: string;
  time_label: string;
  status: ReportStatus;
}

/** Mirrors contracts/risk.md's ForecastEntry exactly. */
export interface ForecastEntry {
  horizon: 'current' | '6h' | '24h' | '48h' | '72h';
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  validated: boolean;
}

export interface ZoneDetail extends ZoneSummary {
  confidence: number | null; // 0-1, nullable per contracts/risk.md
  data_quality: DataQuality;
  updated_at_label: string;
  model_version: string;
  topFactors: ShapFactor[];
  whyNow: WhyNowFactor[];
  forecasts: ForecastEntry[];
  exposure: ExposureSummary;
  recentEvidence: CitizenEvidenceThumb[];
}

export interface RainfallSeriesPoint {
  x: number;
  y: number;
}

export interface RainfallContext {
  zone_cell_id: string;
  station: string;
  windowLabel: string; // "72 h CUMULATIVE"
  series: RainfallSeriesPoint[];
  thresholdY: number;
  crossingX: number;
  totalLabel: string; // "412 mm"
  thresholdLabel: string; // "THRESHOLD 300 mm"
  crossedLabel: string; // "CROSSED 11:20 IST · 3 h 12 m AGO"
  narrative: string;
}

export interface CitizenReportRow {
  report_id: string;
  title: string;
  cell_id: string;
  latitude: number;
  longitude: number;
  reported_severity: ReportedSeverity;
  category: ReportCategory;
  status: ReportStatus;
  time_label: string;
  description: string;
  gps_label: string;
  submitted_label: string;
  media_url?: string | null;
}

export interface AlertDecisionEvent {
  time_label: string;
  text: string;
}

export interface AlertRow {
  alert_id: string;
  severity: RiskLevel;
  cell_id: string;
  label: string;
  created_label: string;
  /** Mirrors contracts/alerts.md AlertState — see CONTRACT_DECISIONS.md CD-003. */
  state: AlertState;
  approvedBy?: string;
  approvedAtLabel?: string;
  resolvedBy?: string;
  resolvedAtLabel?: string;
  runLabel?: string;
  decisionTrail?: AlertDecisionEvent[];
}
