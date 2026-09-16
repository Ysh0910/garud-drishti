import { dashboardRepository } from '../repositories/dashboardRepository';
import { DataQuality } from '../types';

export interface DashboardSummaryResponse {
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

export class DashboardService {
  /**
   * Returns system-wide KPI summary and operational data freshness indicators.
   * Conforms to contracts/dashboard.md §1.
   */
  async getSummary(): Promise<DashboardSummaryResponse> {
    const data = await dashboardRepository.getDashboardSummary();

    return {
      kpi: {
        critical_zones: data.kpi.critical_zones,
        high_risk_zones: data.kpi.high_risk_zones,
        active_alerts: data.kpi.active_alerts,
        new_reports: data.kpi.new_reports,
        roads_at_risk: data.kpi.roads_at_risk,
        villages_at_risk: data.kpi.villages_at_risk,
        unresolved_incidents: data.kpi.unresolved_incidents,
      },
      data_freshness: {
        risk_grid_updated_at: data.data_freshness.risk_grid_updated_at
          ? data.data_freshness.risk_grid_updated_at.toISOString()
          : null,
        rainfall_updated_at: data.data_freshness.rainfall_updated_at
          ? data.data_freshness.rainfall_updated_at.toISOString()
          : null,
        overall_quality: data.data_freshness.overall_quality,
      },
      generated_at: data.generated_at.toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
