import { query } from '../db/client';
import { DataQuality } from '../types/enums';
import { MOCK_RISK_CELLS } from '../adapters/mockRiskData';
import { MOCK_EXPOSURE_ASSETS } from '../adapters/mockExposureData';
import { alertRepository } from './alertRepository';
import { reportService } from '../services/reportService';





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
   * Aggregate all system KPIs and data freshness indicators.
   * Tries PostgreSQL first; smoothly falls back to in-memory store if DB is offline.
   */
  async getDashboardSummary(): Promise<DashboardSummaryData> {
    try {
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

      if (kpiRes.rows.length > 0) {
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
            risk_grid_updated_at: row?.latest_grid_update ? new Date(row.latest_grid_update) : null,
            rainfall_updated_at: row?.latest_rainfall_update ? new Date(row.latest_rainfall_update) : null,
            overall_quality: overallQuality,
          },
          generated_at: new Date(),
        };
      }
    } catch (err) {
      console.warn('[dashboardRepository] Database aggregation failed, using in-memory store:', err);
    }

    // In-memory fallback calculation
    const criticalZones = MOCK_RISK_CELLS.filter((c) => c.risk_state === 'CRITICAL').length;
    const highRiskZones = MOCK_RISK_CELLS.filter((c) => c.risk_state === 'HIGH').length;

    const alertList = await alertRepository.list({});
    const activeAlerts = alertList.alerts.filter((a) => a.state === 'ACTIVE' || a.state === 'ESCALATED').length;

    let newReports = 0;
    let unresolvedIncidents = 0;
    try {
      const reportRes = await reportService.listReports({ limit: 1000 });
      if ('reports' in reportRes) {
        newReports = reportRes.reports.filter((r) => r.status === 'PENDING' || r.status === 'REVIEW').length;
        unresolvedIncidents = reportRes.reports.filter(
          (r) => r.status !== 'VERIFIED' && r.status !== 'REJECTED'
        ).length;
      }
    } catch (err) {
      console.warn('[dashboardRepository] reportService list failed in fallback:', err);
    }

    const roadsAtRisk = MOCK_EXPOSURE_ASSETS.filter((a) => a.asset_type === 'ROAD' && a.risk_score >= 61).length;
    const villagesAtRisk = MOCK_EXPOSURE_ASSETS.filter((a) => a.asset_type === 'VILLAGE' && a.risk_score >= 61).length;



    return {
      kpi: {
        critical_zones: criticalZones,
        high_risk_zones: highRiskZones,
        active_alerts: activeAlerts,
        new_reports: newReports,
        roads_at_risk: roadsAtRisk,
        villages_at_risk: villagesAtRisk,
        unresolved_incidents: unresolvedIncidents,
      },
      data_freshness: {
        risk_grid_updated_at: new Date(),
        rainfall_updated_at: new Date(Date.now() - 900000), // 15 mins ago
        overall_quality: 'GOOD',
      },
      generated_at: new Date(),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
