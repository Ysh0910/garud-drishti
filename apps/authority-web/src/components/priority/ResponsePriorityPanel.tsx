import { usePriorityRanking } from '../../hooks/api';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelStatus from '../common/PanelStatus';

const PRIORITY_BADGE: Record<string, string> = {
  IMMEDIATE: 'badge badge-critical',
  HIGH: 'badge badge-high',
  MEDIUM: 'badge badge-moderate',
  LOW: 'badge badge-low',
};

/**
 * Ranked hazard + exposure + evidence response priority — Tasks/Debarshi/tasks.md Phase 5.2.
 * Scored client-side via services/api/prioritization.ts, a verbatim port of
 * backend/src/services/prioritizationService.ts, so this reads identically whether
 * the app is on mock or real data (VITE_USE_REAL_API).
 */
export default function ResponsePriorityPanel() {
  const { data: ranking, isLoading, isError } = usePriorityRanking();
  const jumpToZone = useDashboardStore((s) => s.jumpToZone);

  function handleSelect(cellId: string, state: string) {
    jumpToZone(cellId, state);
    // The panel lives below the fold, so the map/zone-detail update above it is
    // otherwise invisible without scrolling manually.
    document.getElementById('map-and-zone-row')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (isLoading) {
    return (
      <div className="panel">
        <PanelStatus kind="loading" message="Calculating response priority…" />
      </div>
    );
  }
  if (isError || !ranking) {
    return (
      <div className="panel">
        <PanelStatus kind="error" message="Response priority unavailable right now." />
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">RESPONSE PRIORITY</div>
        <div className="panel-subtle">HAZARD + EXPOSURE + EVIDENCE</div>
      </div>

      <div style={{ padding: '4px 0' }}>
        {ranking.map((entry, i) => (
          <button
            key={entry.zone.cell_id}
            onClick={() => handleSelect(entry.zone.cell_id, entry.zone.state)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              borderBottom: i < ranking.length - 1 ? '1px solid var(--hairline-softer)' : 'none',
              padding: '11px 18px',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', minWidth: 20 }}>
                P{i + 1}
              </span>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                {entry.zone.cell_id}
              </span>
              <span style={{ font: "400 11px/1 var(--font-sans)", color: 'var(--ink-faint)' }}>
                {entry.zone.label}
              </span>
              <span className={PRIORITY_BADGE[entry.response_priority]} style={{ marginLeft: 'auto' }}>
                {entry.response_priority}
              </span>
              <span className="mono tabular" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', minWidth: 28, textAlign: 'right' }}>
                {entry.priority_score}
              </span>
            </div>
            <div style={{ font: "400 11px/1.4 var(--font-sans)", color: 'var(--ink-soft)', paddingLeft: 30 }}>
              {entry.priority_reasons.slice(0, 2).join(' · ')}
            </div>
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 18px', font: "400 10.5px/1.4 var(--font-mono)", color: 'var(--ink-faint)' }}>
        Priority = 0.50×hazard + 0.25×exposure + 0.15×infrastructure + 0.10×connectivity. Transparent, not a black box —
        click a zone to see it on the map.
      </div>
    </div>
  );
}
