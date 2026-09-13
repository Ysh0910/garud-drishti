import { RAINFALL_CONTEXT } from '../../mocks/rainfall';

interface RainfallChartProps {
  height?: number;
  viewBoxWidth?: number;
  showNarrative?: boolean;
}

export default function RainfallChart({ height = 104, viewBoxWidth = 1000, showNarrative = true }: RainfallChartProps) {
  const rc = RAINFALL_CONTEXT;
  const points = rc.series.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
          RAINFALL VS TRIGGERING THRESHOLD · {rc.zone_cell_id}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {rc.station} · {rc.windowLabel}
        </div>
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${viewBoxWidth} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block', background: 'var(--panel-bg-alt)', border: '1px solid var(--hairline-soft)' }}
      >
        <line x1={0} y1={height - 18} x2={viewBoxWidth} y2={height - 18} stroke="var(--hairline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line
          x1={0}
          y1={rc.thresholdY}
          x2={viewBoxWidth}
          y2={rc.thresholdY}
          stroke="var(--risk-critical)"
          strokeWidth={1.4}
          strokeDasharray="7 5"
          vectorEffect="non-scaling-stroke"
        />
        <polyline points={points} fill="none" stroke="#26332E" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line
          x1={rc.crossingX}
          y1={10}
          x2={rc.crossingX}
          y2={height - 10}
          stroke="var(--risk-critical)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={rc.crossingX} cy={rc.thresholdY} r={4} fill="var(--risk-critical)" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 7, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            −72h
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            −48h
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            −24h
          </span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-soft)' }}>
            {rc.totalLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mono">
            <span style={{ width: 14, height: 2, background: '#26332E', display: 'inline-block' }} />
            OBSERVED
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mono">
            <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--risk-critical)', display: 'inline-block' }} />
            {rc.thresholdLabel}
          </span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: 'var(--risk-critical)' }}>
            {rc.crossedLabel}
          </span>
        </div>
      </div>
      {showNarrative && (
        <div style={{ marginTop: 7, font: "400 11.5px/1.5 var(--font-sans)", color: 'var(--ink-soft)' }}>{rc.narrative}</div>
      )}
    </div>
  );
}
