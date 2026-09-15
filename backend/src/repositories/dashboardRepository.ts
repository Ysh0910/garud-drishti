import { query } from '../db/client';
import { DataQuality } from '../types/enums';

export interface DashboardSummaryData {
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
    risk_grid_updated_at: Date | null;
    rainfall_updated_at: Date | null;
    overall_quality: DataQuality;
  };
  generated_at: Date;
}

export class DashboardRepository {
  /**
   * Aggregate all system KPIs and data freshness indicators in a single efficient query.
   */
  async getDashboardSummary(): Promise<DashboardSummaryData> {
    const kpiRes = await query<{
      critical_zones: string;
      high_risk_zones: string;
      active_alerts: string;
      new_reports: string;
      roads_at_risk: string;
      villages_at_risk: string;
      unresolved_incidents: string;
      latest_grid_update: Date | null;
      latest_rainfall_update: Date | null;
      stale_count: string;
    }>(`
      SELECT 
        (SELECT COUNT(*) FROM risk_cells WHERE risk_state = 'CRITICAL')::text AS critical_zones,
        (SELECT COUNT(*) FROM risk_cells WHERE risk_state = 'HIGH')::text AS high_risk_zones,
        (SELECT COUNT(*) FROM alerts WHERE state IN ('ACTIVE', 'ESCALATED'))::text AS active_alerts,
        (SELECT COUNT(*) FROM citizen_reports WHERE status IN ('PENDING', 'REVIEW'))::text AS new_reports,
        (SELECT COUNT(DISTINCT a.asset_id) FROM assets a LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id WHERE a.asset_type = 'ROAD' AND rc.current_risk >= 61)::text AS roads_at_risk,
        (SELECT COUNT(DISTINCT a.asset_id) FROM assets a LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id WHERE a.asset_type = 'VILLAGE' AND rc.current_risk >= 61)::text AS villages_at_risk,
        (SELECT COUNT(*) FROM citizen_reports WHERE status NOT IN ('VERIFIED', 'REJECTED'))::text AS unresolved_incidents,
        (SELECT MAX(updated_at) FROM risk_cells) AS latest_grid_update,
        (SELECT MAX(observed_at) FROM rainfall_observations) AS latest_rainfall_update,
        (SELECT COUNT(*) FROM rainfall_observations WHERE stale = TRUE)::text AS stale_count
    `);

    const row = kpiRes.rows[0];
    const staleCount = parseInt(row?.stale_count || '0', 10);
    const overallQuality: DataQuality = staleCount > 0 ? 'DEGRADED' : 'GOOD';

    return {
      kpi: {
        critical_zones: parseInt(row?.critical_zones || '0', 10),
        high_risk_zones: parseInt(row?.high_risk_zones || '0', 10),
        active_alerts: parseInt(row?.active_alerts || '0', 10),
        new_reports: parseInt(row?.new_reports || '0', 10),
        roads_at_risk: parseInt(row?.roads_at_risk || '0', 10),
        villages_at_risk: parseInt(row?.villages_at_risk || '0', 10),
        unresolved_incidents: parseInt(row?.unresolved_incidents || '0', 10),
      },
      data_freshness: {
        risk_grid_updated_at: row?.latest_grid_update || null,
        rainfall_updated_at: row?.latest_rainfall_update || null,
        overall_quality: overallQuality,
      },
      generated_at: new Date(),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
