/** SYNTHETIC DEMO DATA — matches the shape of contracts/examples/dashboard-summary.json. */
export interface KpiCardData {
  key: string;
  label: string;
  value: number;
  accent: string; // CSS color token for the top border
  delta?: string;
  deltaColor?: string;
  sublabel: string;
}

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

export const KPI_CARDS: KpiCardData[] = [
  {
    key: 'critical',
    label: 'CRITICAL ZONES',
    value: DASHBOARD_SUMMARY.kpi.critical_zones,
    accent: 'var(--risk-critical)',
    delta: '▲ +2',
    deltaColor: 'var(--risk-critical)',
    sublabel: 'of 412 monitored · 24 h change',
  },
  {
    key: 'high',
    label: 'HIGH-RISK ZONES',
    value: DASHBOARD_SUMMARY.kpi.high_risk_zones,
    accent: 'var(--risk-high)',
    delta: '▲ +5',
    deltaColor: 'var(--risk-high)',
    sublabel: 'of 412 monitored · 24 h change',
  },
  {
    key: 'alerts',
    label: 'ACTIVE ALERTS',
    value: DASHBOARD_SUMMARY.kpi.active_alerts,
    accent: 'var(--header-bg-alt)',
    delta: '2 awaiting approval',
    deltaColor: 'var(--ink-muted)',
    sublabel: 'issued in last 24 h',
  },
  {
    key: 'roads',
    label: 'AFFECTED ROADS',
    value: DASHBOARD_SUMMARY.kpi.roads_at_risk,
    accent: 'var(--header-bg-alt)',
    delta: 'segments',
    deltaColor: 'var(--ink-muted)',
    sublabel: 'NH 2 · SH 4 · rural 6',
  },
  {
    key: 'villages',
    label: 'VILLAGES AT RISK',
    value: DASHBOARD_SUMMARY.kpi.villages_at_risk,
    accent: 'var(--header-bg-alt)',
    delta: 'HIGH + CRITICAL',
    deltaColor: 'var(--ink-muted)',
    sublabel: 'est. population 61,400',
  },
  {
    key: 'reports',
    label: 'NEW REPORTS',
    value: DASHBOARD_SUMMARY.kpi.new_reports,
    accent: 'var(--header-bg-alt)',
    delta: '9 pending',
    deltaColor: 'var(--ink-muted)',
    sublabel: 'citizen submissions · 12 h',
  },
];
