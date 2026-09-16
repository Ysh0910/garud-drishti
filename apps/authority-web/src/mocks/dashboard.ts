/** SYNTHETIC DEMO DATA — matches the shape of contracts/examples/dashboard-summary.json. */
export const DASHBOARD_SUMMARY = {
  kpi: {
    critical_zones: 3,
    high_risk_zones: 17,
    active_alerts: 5,
    new_reports: 23,
    roads_at_risk: 12,
    villages_at_risk: 84,
    unresolved_incidents: 9,
  },
  data_freshness: {
    risk_grid_updated_at: '2026-09-13T14:30:00Z',
    rainfall_updated_at: '2026-09-13T14:00:00Z',
    overall_quality: 'DEGRADED' as const,
  },
  generated_at: '2026-09-13T14:32:00Z',
};
