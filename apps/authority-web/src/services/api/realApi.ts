/**
 * Talks to Yashwanth's real backend (backend/src, contracts/*.md). UNTESTED against a
 * live server as of writing — there's no reachable dev instance (needs Postgres/PostGIS)
 * in this environment — so treat this as a best-effort mapping from the real route/
 * controller/schema code, not something that's been round-tripped end to end yet.
 *
 * Known gap: GET /risk/grid only returns hazard fields (contracts/risk.md), not the
 * district/state/population/exposure fields the triage table and prioritization need —
 * those live behind /villages/risk and /roads/risk. Until there's a combined endpoint
 * (or we do the join here ourselves), those fields come back as honest "unknown"
 * placeholders rather than fabricated numbers. Flag this to Yashwanth before actually
 * flipping VITE_USE_REAL_API=true for a demo.
 */
import type { AlertRow, CitizenReportRow, ZoneDetail, ZoneSummary } from '../../types/zone';
import type { Api } from './index';
import type {
  AlertDto,
  DashboardSummaryDto,
  PrioritizationInputDto,
  PrioritizationResultDto,
  ReportDto,
  RiskGridResponseDto,
  RiskZoneDetailDto,
} from './types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Whole-NER bbox by default — the real triage table should eventually pass the
// current map viewport instead of always requesting the full region.
const DEFAULT_BBOX = '87.5,21.5,97.5,29.5';

function mapReport(r: ReportDto): CitizenReportRow {
  return {
    report_id: r.report_id,
    title: (r.description ?? 'Untitled report').slice(0, 60),
    cell_id: r.nearest_cell_id ?? 'Unknown',
    latitude: r.latitude,
    longitude: r.longitude,
    reported_severity: r.severity ?? 'LOW',
    category: r.category,
    status: r.status,
    time_label: r.submitted_at,
    description: r.description ?? '',
    gps_label: `${r.latitude.toFixed(4)}°, ${r.longitude.toFixed(4)}°`,
    submitted_label: `SUBMITTED ${r.submitted_at}`,
  };
}

function mapAlert(a: AlertDto): AlertRow {
  return {
    alert_id: a.alert_id,
    severity: a.severity,
    cell_id: a.cell_id ?? 'Unknown',
    label: a.zone_name ?? a.cell_id ?? 'Unknown',
    created_label: a.created_at,
    state: a.state,
    approvedBy: a.approved_by ?? undefined,
    approvedAtLabel: a.approved_at ?? undefined,
    resolvedAtLabel: a.resolved_at ?? undefined,
  };
}

export const realApi: Api = {
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    return request<DashboardSummaryDto>('/api/v1/dashboard/summary');
  },

  async getZoneSummaries(): Promise<ZoneSummary[]> {
    const grid = await request<RiskGridResponseDto>(`/api/v1/risk/grid?bbox=${DEFAULT_BBOX}`);
    return grid.features.map((f) => ({
      cell_id: f.properties.cell_id,
      label: f.properties.cell_id, // real API doesn't name settlements on the grid — see file header
      district: 'Unknown', // needs a join with /villages/risk — not fabricated
      state: 'Unknown',
      risk_score: f.properties.risk_score,
      risk_level: f.properties.risk_level,
      confidence: f.properties.confidence,
      trend: f.properties.trend,
      trend_delta: 0, // real API doesn't return a delta on the grid feature
      population_exposed: 0, // needs a join with /villages/risk — not fabricated
      exposureFactors: {
        nearby_villages_count: 0,
        has_national_highway: false,
        has_state_highway: false,
        critical_facilities_count: 0,
        has_hospital: false,
        has_school_or_shelter: false,
        has_power_or_comm: false,
      },
    }));
  },

  async getZoneDetail(cellId: string): Promise<ZoneDetail> {
    const dto = await request<RiskZoneDetailDto>(`/api/v1/risk/${cellId}`);
    return {
      cell_id: dto.cell_id,
      label: dto.cell_id,
      district: 'Unknown',
      state: 'Unknown',
      risk_score: dto.current_risk,
      risk_level: dto.risk_level,
      trend: dto.trend,
      trend_delta: 0,
      population_exposed: 0,
      exposureFactors: {
        nearby_villages_count: 0,
        has_national_highway: false,
        has_state_highway: false,
        critical_facilities_count: 0,
        has_hospital: false,
        has_school_or_shelter: false,
        has_power_or_comm: false,
      },
      confidence: dto.confidence,
      data_quality: dto.data_quality,
      updated_at_label: dto.updated_at,
      model_version: dto.model_version,
      topFactors: (dto.explanation?.top_factors ?? []).map((f) => ({
        feature: f.feature,
        impact: f.direction === 'NEGATIVE' ? -Math.abs(f.shap_value) : Math.abs(f.shap_value),
      })),
      whyNow: [], // "change since previous run" is a UI-only concept, not in the real API yet
      forecasts: dto.forecasts.map((f) => ({
        horizon: f.horizon as ZoneDetail['forecasts'][number]['horizon'],
        risk_score: f.risk_score,
        risk_level: f.risk_level,
        validated: f.validated,
      })),
      exposure: {
        population: 0,
        households: 0,
        road_segments: 'Unknown',
        critical_facilities: 'Unknown',
      },
      recentEvidence: [],
    };
  },

  async getAlerts(): Promise<AlertRow[]> {
    const alerts = await request<AlertDto[]>('/api/v1/alerts');
    return alerts.map(mapAlert);
  },

  async approveAlert(alertId, approverName): Promise<AlertRow> {
    const dto = await request<AlertDto>(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ approved_by: approverName }),
    });
    return mapAlert(dto);
  },

  async resolveAlert(alertId, resolverName): Promise<AlertRow> {
    // The real endpoint takes a free-text resolution_reason, not a resolver name field
    // on the response (see backend/src/services/alertService.ts AlertResponse — there's
    // no resolved_by on the record). We still pass the name through as context.
    const dto = await request<AlertDto>(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolved_by: resolverName }),
    });
    return mapAlert(dto);
  },

  async getReports(): Promise<CitizenReportRow[]> {
    // GET /reports returns a { reports, total, limit, offset } envelope, not a bare array.
    const res = await request<{ reports: ReportDto[] }>('/api/v1/reports');
    return res.reports.map(mapReport);
  },

  async verifyReport(reportId, action, rejectionReason): Promise<CitizenReportRow> {
    const dto = await request<ReportDto>(`/api/v1/reports/${reportId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, rejection_reason: rejectionReason ?? null }),
    });
    return mapReport(dto);
  },

  async evaluatePriority(input: PrioritizationInputDto): Promise<PrioritizationResultDto> {
    const res = await request<{ success: boolean; data: PrioritizationResultDto }>(
      '/api/v1/prioritization/evaluate',
      { method: 'POST', body: JSON.stringify(input) },
    );
    return res.data;
  },
};
