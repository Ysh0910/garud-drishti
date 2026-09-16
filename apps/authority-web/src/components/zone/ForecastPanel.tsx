import type { ForecastEntry } from '../../types/zone';
import { formatScore01, riskBadgeClass } from '../../utils/risk';

const HORIZON_LABEL: Record<ForecastEntry['horizon'], string> = {
  current: 'CURRENT',
  '6h': '6 HOURS',
  '24h': '24 HOURS',
  '48h': '48 HOURS',
  '72h': '72 HOURS',
};

/**
 * Multi-horizon risk forecast — docs/fetures/FEATURE_Authority_Dashboard.md's
 * "Risk Forecast Panel" (table + trend line), scoped to the selected zone.
 * Unvalidated horizons (contracts/risk.md §5) are drawn dashed/muted, never
 * presented as equally reliable to CURRENT/24h.
 */
export default function ForecastPanel({ forecasts }: { forecasts: ForecastEntry[] }) {
  if (forecasts.length === 0) {
    return (
      <div style={{ borderTop: '1px solid var(--hairline-soft)', borderBottom: '1px solid var(--hairline-soft)', padding: '16px 18px' }}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
          RISK FORECAST
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 8 }}>
          No forecast available for this zone.
        </div>
      </div>
    );
  }

  const width = 300;
  const height = 64;
  const maxScore = 100;
  const stepX = width / (forecasts.length - 1 || 1);
  const points = forecasts.map((f, i) => ({
    x: i * stepX,
    y: height - (f.risk_score / maxScore) * height,
    f,
  }));

  return (
    <div
      style={{
        borderTop: '1px solid var(--hairline-soft)',
        borderBottom: '1px solid var(--hairline-soft)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
          RISK FORECAST
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
          SOLID = VALIDATED · DASHED = NOT YET VALIDATED
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {forecasts.map((f) => (
          <div
            key={f.horizon}
            style={{ display: 'grid', gridTemplateColumns: '84px 44px minmax(0,1fr) auto', alignItems: 'center', gap: 9 }}
          >
            <span className="mono" style={{ fontSize: 11, color: f.validated ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
              {HORIZON_LABEL[f.horizon]}
            </span>
            <span
              className="mono tabular"
              style={{ fontSize: 13, fontWeight: 600, color: f.validated ? 'var(--ink)' : 'var(--ink-faint)' }}
            >
              {formatScore01(f.risk_score)}
            </span>
            <div style={{ height: 6, background: 'var(--hairline-softer)' }}>
              <div
                style={{
                  width: `${f.risk_score}%`,
                  height: '100%',
                  background: f.validated ? 'var(--header-bg-alt)' : 'var(--border-strong)',
                  backgroundImage: f.validated
                    ? undefined
                    : 'repeating-linear-gradient(45deg, var(--ink-faint) 0 3px, transparent 3px 6px)',
                }}
              />
            </div>
            <span className={riskBadgeClass(f.risk_level)} style={{ opacity: f.validated ? 1 : 0.6 }}>
              {f.risk_level.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      <svg width="100%" height={height + 8} viewBox={`0 -4 ${width} ${height + 8}`} preserveAspectRatio="none">
        {points.slice(1).map((p, i) => {
          const prev = points[i];
          const bothValidated = prev.f.validated && p.f.validated;
          return (
            <line
              key={p.f.horizon}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke="var(--header-bg-alt)"
              strokeWidth={1.6}
              strokeDasharray={bothValidated ? undefined : '4 3'}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {points.map((p) => (
          <circle
            key={p.f.horizon}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={p.f.validated ? 'var(--header-bg-alt)' : 'var(--panel-bg)'}
            stroke="var(--header-bg-alt)"
            strokeWidth={1.4}
          />
        ))}
      </svg>
    </div>
  );
}
