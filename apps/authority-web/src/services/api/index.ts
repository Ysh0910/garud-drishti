import type { AlertRow, CitizenReportRow, ZoneDetail, ZoneSummary } from '../../types/zone';
import type { DashboardSummaryDto, PrioritizationInputDto, PrioritizationResultDto, ReportVerifyAction } from './types';

/**
 * The one boundary components are allowed to depend on for server data.
 * Never import mocks/*.ts or fetch() directly from a component — go through `api`
 * (or, preferably, the hooks in src/hooks/api.ts) so that switching from demo mock
 * data to the real backend is a one-line change here, not a per-component rewrite.
 */
export interface Api {
  getDashboardSummary(): Promise<DashboardSummaryDto>;
  getZoneSummaries(): Promise<ZoneSummary[]>;
  getZoneDetail(cellId: string): Promise<ZoneDetail>;
  getAlerts(): Promise<AlertRow[]>;
  /** PENDING_APPROVAL -> ACTIVE. Mirrors POST /api/v1/alerts/{id}/acknowledge. */
  approveAlert(alertId: string, approverName: string): Promise<AlertRow>;
  /** ACTIVE | ESCALATED -> RESOLVED. Mirrors POST /api/v1/alerts/{id}/resolve. */
  resolveAlert(alertId: string, resolverName: string): Promise<AlertRow>;
  getReports(): Promise<CitizenReportRow[]>;
  /** Mirrors POST /api/v1/reports/{id}/verify. rejectionReason is required when action is REJECT. */
  verifyReport(reportId: string, action: ReportVerifyAction, rejectionReason?: string): Promise<CitizenReportRow>;
  evaluatePriority(input: PrioritizationInputDto): Promise<PrioritizationResultDto>;
}

export interface RankedZonePriority extends PrioritizationResultDto {
  zone: ZoneSummary;
}

/**
 * Builds the Response Priority ranking client-side from whichever `api` is active:
 * fetch every monitored zone, score each with the same formula the backend uses
 * (services/api/prioritization.ts), and sort by priority_score. There is no single
 * "ranking" endpoint on the real backend (POST /prioritization/evaluate scores one
 * zone at a time) — this aggregation works identically in both Mock and Real modes.
 */
export async function getPriorityRanking(api: Api): Promise<RankedZonePriority[]> {
  const zones = await api.getZoneSummaries();
  const results = await Promise.all(
    zones.map(async (zone) => {
      const result = await api.evaluatePriority({
        hazard_score: zone.risk_score,
        trend: zone.trend,
        population: zone.population_exposed,
        nearby_villages_count: zone.exposureFactors.nearby_villages_count,
        has_national_highway: zone.exposureFactors.has_national_highway,
        has_state_highway: zone.exposureFactors.has_state_highway,
        critical_facilities_count: zone.exposureFactors.critical_facilities_count,
        has_hospital: zone.exposureFactors.has_hospital,
        has_school_or_shelter: zone.exposureFactors.has_school_or_shelter,
        has_power_or_comm: zone.exposureFactors.has_power_or_comm,
      });
      return { ...result, zone };
    }),
  );
  return results.sort((a, b) => b.priority_score - a.priority_score);
}

// --- Mode selection -------------------------------------------------------
// VITE_USE_REAL_API=true (in apps/authority-web/.env.local) switches every hook
// in src/hooks/api.ts over to the real backend at VITE_API_BASE_URL, with zero
// component changes. Defaults to the mock so the console keeps working with no
// backend running.
import { mockApi } from './mockApi';
import { realApi } from './realApi';

const useReal = import.meta.env.VITE_USE_REAL_API === 'true';
export const api: Api = useReal ? realApi : mockApi;
