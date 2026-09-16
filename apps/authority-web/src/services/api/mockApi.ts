import { ALERT_ROWS } from '../../mocks/alerts';
import { DASHBOARD_SUMMARY } from '../../mocks/dashboard';
import { CITIZEN_REPORTS } from '../../mocks/reports';
import { scoreToRiskLevel } from '../../mocks/riskGrid';
import { SELECTED_ZONE_DETAIL, ZONE_SUMMARIES } from '../../mocks/zones';
import { RISK_GRID } from '../../mocks/riskGrid';
import type { AlertRow, CitizenReportRow, ForecastEntry, ZoneDetail, ZoneSummary } from '../../types/zone';
import type { Api } from './index';
import type { DashboardSummaryDto, PrioritizationInputDto, PrioritizationResultDto, RiskGridResponseDto } from './types';
import { calculateResponsePriority } from './prioritization';

/** Small, deterministic network-latency simulation so loading states are actually exercised in the UI. */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Must match store/dashboardStore.ts HORIZON_VALIDATED — only current + 24h are
// trained/evaluated at hackathon scope (contracts/risk.md §5).
const FALLBACK_HORIZON_VALIDATED: Record<ForecastEntry['horizon'], boolean> = {
  current: true,
  '6h': false,
  '24h': true,
  '48h': false,
  '72h': false,
};
// Relative weight applied to a zone's trend_delta per horizon — a zone that's
// "increasing" extrapolates further out at longer horizons, tapering off by 72h
// rather than growing without bound. Purely a display heuristic for zones without
// hand-authored forecasts (only NER-ML-042 has one) — never claim these as validated.
const FALLBACK_HORIZON_WEIGHT: Record<ForecastEntry['horizon'], number> = {
  current: 0,
  '6h': 0.6,
  '24h': 1,
  '48h': 0.8,
  '72h': 0.5,
};

function buildFallbackForecasts(summary: ZoneSummary): ForecastEntry[] {
  return (Object.keys(FALLBACK_HORIZON_WEIGHT) as ForecastEntry['horizon'][]).map((horizon) => {
    const score = Math.round(
      Math.min(100, Math.max(0, summary.risk_score + summary.trend_delta * 100 * FALLBACK_HORIZON_WEIGHT[horizon])),
    );
    return { horizon, risk_score: score, risk_level: scoreToRiskLevel(score), validated: FALLBACK_HORIZON_VALIDATED[horizon] };
  });
}

export const mockApi: Api = {
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    return delay(DASHBOARD_SUMMARY);
  },

  async getRiskGrid(): Promise<RiskGridResponseDto> {
    return delay({
      type: 'FeatureCollection',
      features: (RISK_GRID.features as any) || [],
      meta: {
        horizon: 'current',
        generated_at: new Date().toISOString(),
        total_cells: RISK_GRID.features.length,
        model_version: 'dynamic_xgb_v1',
      },
    });
  },

  async getZoneSummaries(): Promise<ZoneSummary[]> {
    return delay(ZONE_SUMMARIES);
  },

  async getZoneDetail(cellId: string): Promise<ZoneDetail> {
    if (cellId === SELECTED_ZONE_DETAIL.cell_id) return delay(SELECTED_ZONE_DETAIL);
    const summary = ZONE_SUMMARIES.find((z) => z.cell_id === cellId);
    if (!summary) throw new Error(`Unknown zone: ${cellId}`);
    // Only NER-ML-042 has hand-authored SHAP/why-now/evidence mock content; other zones
    // fall back to a minimal detail view built from their summary fields.
    return delay({
      ...summary,
      data_quality: 'GOOD',
      updated_at_label: 'just now',
      model_version: SELECTED_ZONE_DETAIL.model_version,
      topFactors: [],
      whyNow: [],
      forecasts: buildFallbackForecasts(summary),
      exposure: {
        population: summary.population_exposed,
        households: Math.round(summary.population_exposed / 5),
        road_segments: summary.exposureFactors.has_national_highway
          ? '1 · National Highway'
          : summary.exposureFactors.has_state_highway
            ? '1 · State Highway'
            : '0',
        critical_facilities: summary.exposureFactors.critical_facilities_count > 0
          ? `${summary.exposureFactors.critical_facilities_count} facility(ies)`
          : 'none recorded',
      },
      recentEvidence: [],
    });
  },

  async getAlerts(): Promise<AlertRow[]> {
    return delay(ALERT_ROWS);
  },

  async approveAlert(alertId, approverName): Promise<AlertRow> {
    const alert = ALERT_ROWS.find((a) => a.alert_id === alertId);
    if (!alert) throw new Error(`Unknown alert: ${alertId}`);
    alert.state = 'ACTIVE';
    alert.approvedBy = approverName;
    alert.approvedAtLabel = nowLabel();
    return delay({ ...alert }, 150);
  },

  async resolveAlert(alertId, resolverName): Promise<AlertRow> {
    const alert = ALERT_ROWS.find((a) => a.alert_id === alertId);
    if (!alert) throw new Error(`Unknown alert: ${alertId}`);
    alert.state = 'RESOLVED';
    alert.resolvedBy = resolverName;
    alert.resolvedAtLabel = nowLabel();
    return delay({ ...alert }, 150);
  },

  async getReports(): Promise<CitizenReportRow[]> {
    return delay(CITIZEN_REPORTS);
  },

  async verifyReport(reportId, action, rejectionReason): Promise<CitizenReportRow> {
    const report = CITIZEN_REPORTS.find((r) => r.report_id === reportId);
    if (!report) throw new Error(`Unknown report: ${reportId}`);
    if (action === 'REJECT' && !rejectionReason?.trim()) {
      throw new Error('rejection_reason is required when action is REJECT');
    }
    report.status = action === 'VERIFY' ? 'VERIFIED' : action === 'REJECT' ? 'REJECTED' : 'PROBABLE';
    return delay({ ...report }, 150);
  },

  async evaluatePriority(input: PrioritizationInputDto): Promise<PrioritizationResultDto> {
    return delay(calculateResponsePriority(input), 80);
  },
};
