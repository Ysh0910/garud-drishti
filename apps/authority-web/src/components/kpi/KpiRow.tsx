import { useDashboardSummary } from '../../hooks/api';
import type { DashboardSummaryDto } from '../../services/api/types';
import PanelStatus from '../common/PanelStatus';

interface CardSpec {
  key: keyof DashboardSummaryDto['kpi'];
  label: string;
  accent: string;
}

const CARDS: CardSpec[] = [
  { key: 'critical_zones', label: 'CRITICAL ZONES', accent: 'var(--risk-critical)' },
  { key: 'high_risk_zones', label: 'HIGH-RISK ZONES', accent: 'var(--risk-high)' },
  { key: 'active_alerts', label: 'ACTIVE ALERTS', accent: 'var(--header-bg-alt)' },
  { key: 'roads_at_risk', label: 'AFFECTED ROADS', accent: 'var(--header-bg-alt)' },
  { key: 'villages_at_risk', label: 'VILLAGES AT RISK', accent: 'var(--header-bg-alt)' },
  { key: 'new_reports', label: 'NEW REPORTS', accent: 'var(--header-bg-alt)' },
];

export default function KpiRow() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) return <PanelStatus kind="loading" message="Loading KPIs…" />;
  if (isError || !data) return <PanelStatus kind="error" message="KPI summary unavailable right now." />;

  return (
    <div className="grid-divider" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}>
      {CARDS.map((card) => (
        <div
          key={card.key}
          style={{
            background: 'var(--panel-bg)',
            padding: '14px 18px 13px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            borderTop: `3px solid ${card.accent}`,
          }}
        >
          <div className="eyebrow">{card.label}</div>
          <span className="mono tabular" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1, color: 'var(--ink)' }}>
            {data.kpi[card.key]}
          </span>
          <div style={{ font: "400 11.5px/1 var(--font-sans)", color: 'var(--ink-faint)' }}>
            data quality: {data.data_freshness.overall_quality}
          </div>
        </div>
      ))}
    </div>
  );
}
