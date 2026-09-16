import { TOTAL_MONITORED_ZONES, ZONE_SUMMARIES } from '../../mocks/zones';
import { useDashboardStore, type RankBy } from '../../store/dashboardStore';
import { formatDelta, formatScore01, riskBadgeClass, trendGlyph } from '../../utils/risk';

const RANK_OPTIONS: { key: RankBy; label: string }[] = [
  { key: 'RISK_X_EXPOSURE', label: 'RISK × EXPOSURE' },
  { key: 'SCORE', label: 'SCORE' },
  { key: 'TREND', label: 'TREND' },
];

const COLS = '26px minmax(0,1fr) 96px 52px 46px';

export default function ZoneTriagePanel() {
  const { selectedCellId, selectZone, rankBy, setRankBy } = useDashboardStore();

  const rows = [...ZONE_SUMMARIES].sort((a, b) => {
    if (rankBy === 'SCORE') return b.risk_score - a.risk_score;
    if (rankBy === 'TREND') return Math.abs(b.trend_delta) - Math.abs(a.trend_delta);
    // RISK_X_EXPOSURE: approximate a combined ranking
    return b.risk_score * b.population_exposed - a.risk_score * a.population_exposed;
  });

  return (
    <div className="panel">
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="panel-title">ZONE TRIAGE</div>
          <div className="panel-subtle">{TOTAL_MONITORED_ZONES} MONITORED</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-muted)' }}>
            RANK BY
          </span>
          <div className="seg">
            {RANK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRankBy(opt.key)}
                style={{
                  background: rankBy === opt.key ? 'var(--header-bg)' : 'var(--panel-bg)',
                  color: rankBy === opt.key ? 'var(--header-ink)' : 'var(--ink-soft)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: 8,
          padding: '8px 16px',
          background: 'var(--panel-bg-row-alt)',
          borderBottom: '1px solid var(--hairline-soft)',
          font: "500 11px/1 var(--font-mono)",
          letterSpacing: '0.09em',
          color: 'var(--ink-muted)',
        }}
      >
        <div>#</div>
        <div>ZONE</div>
        <div>STATE</div>
        <div style={{ textAlign: 'right' }}>SCORE</div>
        <div style={{ textAlign: 'right' }}>TREND</div>
      </div>

      {rows.map((zone, i) => {
        const isSelected = zone.cell_id === selectedCellId;
        const { glyph, color } = trendGlyph(zone.trend);
        return (
          <button
            key={zone.cell_id}
            onClick={() => selectZone(zone.cell_id)}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 8,
              padding: '10px 16px',
              borderBottom: '1px solid var(--hairline-softer)',
              borderLeft: isSelected ? '3px solid var(--risk-critical)' : '3px solid transparent',
              alignItems: 'center',
              background: isSelected ? 'var(--panel-bg-critical-row)' : 'transparent',
              border: 'none',
              borderBottomStyle: 'solid',
              textAlign: 'left',
              cursor: 'pointer',
              width: '100%',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              {i + 1}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span className="mono" style={{ fontSize: 12.5, lineHeight: 1, color: 'var(--ink)' }}>
                {zone.cell_id}
              </span>
              <span style={{ font: "400 11px/1 var(--font-sans)", color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {zone.label} · {zone.population_exposed.toLocaleString()} exposed
              </span>
            </div>
            <div className={riskBadgeClass(zone.risk_level)} style={{ textAlign: 'center' }}>
              {zone.risk_level.replace('_', ' ')}
            </div>
            <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>
              {formatScore01(zone.risk_score)}
            </div>
            <div className="mono" style={{ fontSize: 11.5, fontWeight: 500, color, textAlign: 'right' }}>
              {glyph} {formatDelta(zone.trend_delta)}
            </div>
          </button>
        );
      })}

      <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          SHOWING TOP {rows.length} OF {TOTAL_MONITORED_ZONES}
        </span>
        <a href="#full-worklist" className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
          OPEN FULL WORKLIST →
        </a>
      </div>
    </div>
  );
}
