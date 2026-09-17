import { useState } from 'react';
import { useCreateAlert, useZoneDetail, useZoneSummaries } from '../../hooks/api';
import { TOTAL_MONITORED_ZONES } from '../../mocks/zones';
import { useDashboardStore } from '../../store/dashboardStore';
import type { DataQuality } from '../../types/enums';
import { formatScore01, riskBadgeClass, trendGlyph } from '../../utils/risk';
import PanelStatus from '../common/PanelStatus';
import ForecastPanel from './ForecastPanel';

const DATA_QUALITY_STYLE: Record<DataQuality, { color: string; bg: string }> = {
  GOOD: { color: 'var(--good-ink)', bg: 'var(--good-bg)' },
  DEGRADED: { color: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  STALE: { color: 'var(--warn-text)', bg: 'var(--warn-bg)' },
  MISSING: { color: 'var(--rejected-ink)', bg: 'var(--rejected-bg)' },
};

function DataQualityBadge({ quality }: { quality: DataQuality }) {
  const style = DATA_QUALITY_STYLE[quality];
  return (
    <span
      className="mono"
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '2px 7px',
        color: style.color,
        background: style.bg,
      }}
      title="Data quality — freshness/completeness of inputs behind this prediction (contracts/risk.md)"
    >
      DATA: {quality}
    </span>
  );
}

export default function SelectedZonePanel() {
  const selectedCellId = useDashboardStore((s) => s.selectedCellId);
  const openReport = useDashboardStore((s) => s.openReport);

  const { data: zones } = useZoneSummaries();
  const { data: detail, isLoading, isError } = useZoneDetail(selectedCellId);
  const createAlert = useCreateAlert();
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const handleDispatchAlert = async () => {
    if (!detail) return;
    try {
      await createAlert.mutateAsync({
        cell_id: detail.cell_id,
        severity: detail.risk_level,
        trigger_reason: `Official ${detail.risk_level} emergency early warning issued for ${detail.district || 'monitored corridor'}, ${detail.state}. Satellite and rainfall triggers active.`,
        zone_name: `${detail.cell_id} · ${detail.district || 'NER'}`,
      });
      setDispatchStatus('✓ ALERT BROADCAST SENT TO MOBILE APP');
      setTimeout(() => setDispatchStatus(null), 4000);
    } catch {
      setDispatchStatus('✕ Broadcast failed. Please retry.');
      setTimeout(() => setDispatchStatus(null), 3000);
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="panel">
        <PanelStatus kind="loading" message="Loading zone detail…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="panel">
        <PanelStatus kind="error" message="Zone detail unavailable right now." />
      </div>
    );
  }

  const summary = detail;
  const rank = (zones?.findIndex((z) => z.cell_id === summary.cell_id) ?? -1) + 1;
  const { glyph, color } = trendGlyph(summary.trend);

  const maxAbsWhyNow = Math.max(...detail.whyNow.map((f) => Math.abs(f.sincePreviousRun)), 0.01);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">SELECTED ZONE</div>
        <div className="panel-subtle">
          RANK {rank} OF {TOTAL_MONITORED_ZONES}
        </div>
      </div>

      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="eyebrow">MONITORED ZONE</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {summary.cell_id}
            </div>
            <div style={{ font: "400 12px/1.3 var(--font-sans)", color: 'var(--ink-muted)' }}>
              {summary.district} · {summary.state}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
            <div className="eyebrow">RISK LEVEL</div>
            <div className={`${riskBadgeClass(summary.risk_level)} badge-lg`} style={{ letterSpacing: '0.06em' }}>
              {summary.risk_level.replace('_', ' ')}
            </div>
          </div>
        </div>

        <div className="grid-divider" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', border: '1px solid var(--hairline-soft)' }}>
          <div style={{ background: 'var(--panel-bg-tint)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
              RISK SCORE
            </div>
            <div className="mono tabular" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>
              {formatScore01(summary.risk_score)}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {summary.risk_score}/100
            </div>
          </div>
          <div style={{ background: 'var(--panel-bg-tint)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
              CONFIDENCE
            </div>
            <div className="mono tabular" style={{ fontSize: 22, fontWeight: 700, color: detail.confidence == null ? 'var(--ink-faint)' : 'var(--ink)' }}>
              {detail.confidence == null ? 'N/A' : detail.confidence.toFixed(2)}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {detail.confidence == null ? 'Uncalibrated' : 'Ensemble spread'}
            </div>
          </div>
          <div style={{ background: 'var(--panel-bg-tint)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
              TREND 6H
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color }}>
                {glyph}
              </span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                {summary.trend_delta >= 0 ? '+' : ''}
                {summary.trend_delta.toFixed(2)}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {summary.trend === 'INCREASING' ? 'Rising' : summary.trend === 'DECREASING' ? 'Falling' : 'Steady'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "400 11px/1 var(--font-mono)", color: 'var(--ink-faint)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)' }} />
            LAST UPDATED {detail.updated_at_label.toUpperCase()}
          </div>
          <DataQualityBadge quality={detail.data_quality} />
        </div>
      </div>

      <ForecastPanel forecasts={detail.forecasts} />

      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
            WHY NOW · CHANGE SINCE 08:30 RUN
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            Δ SHAP
          </div>
        </div>
        {detail.whyNow.length === 0 && (
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', padding: '6px 0' }}>
            No SHAP delta recorded for this run.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {detail.whyNow.map((f) => {
            const pct = (Math.abs(f.sincePreviousRun) / maxAbsWhyNow) * 44;
            const positive = f.sincePreviousRun >= 0;
            return (
              <div key={f.feature} style={{ display: 'grid', gridTemplateColumns: '126px minmax(0,1fr) 48px', alignItems: 'center', gap: 9 }}>
                <div style={{ font: "400 11.5px/1.2 var(--font-sans)", color: 'var(--ink)' }}>{f.feature}</div>
                <div style={{ position: 'relative', height: 10, background: 'var(--hairline-softer)' }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: 10, background: '#C4C0B4' }} />
                  {f.sincePreviousRun !== 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        [positive ? 'left' : 'right']: '50%',
                        top: 0,
                        width: `${pct}%`,
                        height: 10,
                        background: positive ? 'var(--ink-soft)' : '#9FA8A0',
                      }}
                    />
                  )}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11.5, fontWeight: 500, textAlign: 'right', color: f.sincePreviousRun === 0 ? 'var(--ink-muted)' : 'var(--ink)' }}
                >
                  {f.sincePreviousRun >= 0 ? '+' : ''}
                  {f.sincePreviousRun.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ font: "400 11px/1.4 var(--font-sans)", color: 'var(--ink-faint)' }}>
          Left of centre eased risk; right of centre raised it. Static factors (slope, lithology) contribute to base susceptibility.
        </div>
      </div>

      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
          EXPOSURE SUMMARY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '9px 14px' }}>
          <ExposureStat label="POPULATION" value={detail.exposure.population.toLocaleString()} />
          <ExposureStat label="HOUSEHOLDS" value={detail.exposure.households.toLocaleString()} />
          <ExposureStat label="ROAD SEGMENTS" value={String(detail.exposure.road_segments)} />
          <ExposureStat label="CRITICAL FACILITIES" value={String(detail.exposure.critical_facilities)} />
        </div>
        <div style={{ font: "400 11.5px/1.5 var(--font-sans)", color: 'var(--ink-faint)' }}>
          Census 2011 projected to 2026; treat as planning estimate.
        </div>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
            RECENT CITIZEN EVIDENCE
          </div>
          <a href="#reports" className="mono" style={{ fontSize: 11, fontWeight: 500 }}>
            VIEW ALL {detail.recentEvidence.length} →
          </a>
        </div>
        {detail.recentEvidence.length === 0 && (
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            No citizen evidence recorded near this zone yet.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(detail.recentEvidence.length, 1)}, minmax(0,1fr))`, gap: 8 }}>
          {detail.recentEvidence.map((ev) => (
            <button
              key={ev.report_id}
              onClick={() => openReport(ev.report_id)}
              style={{ display: 'flex', flexDirection: 'column', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <div className="thumb-photo" style={{ height: 70, display: 'flex', alignItems: 'flex-end', padding: 5 }}>
                <span className="mono" style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--ink-muted)' }}>
                  PHOTO
                  <br />
                  {ev.report_id}
                </span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                {ev.time_label} · {ev.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {dispatchStatus && (
          <div
            className="mono"
            style={{
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textAlign: 'center',
              color: dispatchStatus.startsWith('✓') ? 'var(--good-ink)' : 'var(--rejected-ink)',
              background: dispatchStatus.startsWith('✓') ? 'var(--good-bg)' : 'var(--rejected-bg)',
              border: '1px solid currentColor',
            }}
          >
            {dispatchStatus}
          </div>
        )}
        <button
          className="btn btn-primary"
          disabled={createAlert.isPending}
          onClick={handleDispatchAlert}
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
        >
          {createAlert.isPending ? 'DISPATCHING ALERT…' : '🚨 SEND ALERT NOTIFICATION'}
        </button>
        <a href="/situation-report" className="mono" style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 500, padding: 2 }}>
          ADD TO SITUATION REPORT →
        </a>
      </div>
    </div>
  );
}

function ExposureStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  );
}
