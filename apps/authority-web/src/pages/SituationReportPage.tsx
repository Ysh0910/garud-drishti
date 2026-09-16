import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RAINFALL_CONTEXT } from '../mocks/rainfall';
import { useDashboardSummary, usePriorityRanking } from '../hooks/api';
import RiskMapPanelMap from '../components/map/RiskMap';
import { formatScore01 } from '../utils/risk';
import '../styles/situationReport.css';

const PRIORITY_COLS = '24px 104px 92px 50px 56px minmax(0,1fr)';

const RISK_LEVEL_INK: Record<string, string> = {
  CRITICAL: 'var(--risk-critical)',
  HIGH: 'var(--risk-high)',
  MODERATE: '#8A6A14',
  LOW: 'var(--risk-low)',
  VERY_LOW: 'var(--risk-very-low)',
};

export default function SituationReportPage() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useDashboardSummary();
  const { data: ranking, isLoading: rankingLoading, isError: rankingError } = usePriorityRanking();
  const rc = RAINFALL_CONTEXT;
  const points = rc.series.map((p) => `${(p.x / 1000) * 400},${(p.y / 104) * 86}`).join(' ');
  const priorityZones = (ranking ?? []).slice(0, 5);

  if (summaryLoading || rankingLoading) {
    return (
      <div className="sr-wrapper">
        <div className="sr-page" style={{ padding: 60, textAlign: 'center' }}>
          <span className="mono" style={{ color: 'var(--ink-faint)' }}>
            Loading situation report…
          </span>
        </div>
      </div>
    );
  }
  if (summaryError || rankingError || !summary) {
    return (
      <div className="sr-wrapper">
        <div className="sr-page" style={{ padding: 60, textAlign: 'center' }}>
          <span className="mono" style={{ color: 'var(--warn-text)' }}>
            Situation report data unavailable right now.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-wrapper">
      <div className="sr-toolbar no-print">
        <Link to="/" className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
          ← BACK TO CONSOLE
        </Link>
        <button className="mono btn btn-outline" onClick={() => window.print()} style={{ padding: '6px 12px' }}>
          PRINT / EXPORT PDF
        </button>
      </div>

      <div className="sr-page">
        <div className="sr-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--ink)' }}>
          <div style={{ paddingLeft: 40, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 26, height: 26, border: '1.5px solid var(--header-bg)', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 9, height: 9, background: 'var(--header-bg)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ font: "700 15px/1 var(--font-sans)", letterSpacing: '0.14em', color: 'var(--ink)' }}>GARUD DRISHTI</div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
                DAILY LANDSLIDE SITUATION REPORT
              </div>
            </div>
          </div>
          <div style={{ paddingRight: 40, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink)' }}>
              13 SEP 2026 · 09:00 IST
            </div>
            <div className="mono" style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--ink-muted)' }}>
              MODEL RUN 2026-09-13T08:30Z
              <br />
              MEGHALAYA · ALL DISTRICTS
            </div>
          </div>
        </div>

        <div className="grid-divider sr-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', border: '1px solid var(--hairline-soft)' }}>
          <ReportKpi label="CRITICAL ZONES" value={summary.kpi.critical_zones} />
          <ReportKpi label="HIGH-RISK ZONES" value={summary.kpi.high_risk_zones} />
          <ReportKpi label="VILLAGES AT RISK" value={summary.kpi.villages_at_risk} />
          <ReportKpi label="ALERTS ISSUED 24 h" value={summary.kpi.active_alerts} />
        </div>

        <div className="sr-section-map">
          <SectionLabel>1 · REGIONAL RISK SURFACE (DISTRICT AGGREGATE)</SectionLabel>
          <div style={{ border: '1px solid var(--hairline)' }}>
            <RiskMapPanelMap height={240} coarse />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap', whiteSpace: 'nowrap' }}>
            <LegendChip color="var(--risk-critical)" label="CRITICAL" />
            <LegendChip color="var(--risk-high)" label="HIGH" />
            <LegendChip color="var(--risk-moderate)" label="MODERATE" />
            <LegendChip color="var(--risk-low)" label="LOW" />
            <LegendChip color="var(--risk-very-low)" label="VERY LOW" />
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mono">
              <span style={{ width: 14, height: 10, background: 'repeating-linear-gradient(45deg, var(--risk-critical) 0 3px, #FBFAF6 3px 7px)', display: 'inline-block' }} />
              LOW CONFIDENCE
            </span>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-faint)' }}>
              Boundaries indicative · corridors schematic
            </span>
          </div>
        </div>

        <div className="sr-section-priority">
          <SectionLabel>2 · PRIORITY ZONES</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: PRIORITY_COLS, gap: 8, padding: '7px 0', borderBottom: '1px solid var(--ink)', font: "500 11px/1 var(--font-mono)", letterSpacing: '0.08em', color: 'var(--ink-muted)' }}>
            <div>#</div>
            <div>ZONE</div>
            <div>RISK STATE</div>
            <div style={{ textAlign: 'right' }}>SCORE</div>
            <div style={{ textAlign: 'right' }}>CONF.</div>
            <div>EXPOSURE / ACTION TAKEN</div>
          </div>
          {priorityZones.map((entry, i) => {
            const z = entry.zone;
            return (
              <div
                key={z.cell_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: PRIORITY_COLS,
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--hairline-softer)',
                  alignItems: 'center',
                  font: "400 11.5px/1 var(--font-mono)",
                  color: 'var(--ink)',
                }}
              >
                <div style={{ color: 'var(--ink-muted)' }}>{i + 1}</div>
                <div style={{ fontWeight: 500 }}>{z.cell_id}</div>
                <div style={{ color: RISK_LEVEL_INK[z.risk_level], fontWeight: 600 }}>{z.risk_level.replace('_', ' ')}</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{formatScore01(z.risk_score)}</div>
                <div style={{ textAlign: 'right', color: z.confidence == null ? 'var(--ink-faint)' : 'var(--ink)' }}>
                  {z.confidence == null ? 'N/A' : z.confidence.toFixed(2)}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)' }}>
                  {z.population_exposed.toLocaleString()} people · {entry.response_priority} priority ({entry.priority_score}) ·{' '}
                  {entry.priority_reasons[0]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sr-section-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 26 }}>
          <div>
            <SectionLabel>3 · RAINFALL POSITION</SectionLabel>
            <svg width="100%" height={86} viewBox="0 0 400 86" preserveAspectRatio="none" style={{ display: 'block', background: 'var(--panel-bg-alt)', border: '1px solid var(--hairline-soft)' }}>
              <line x1={0} y1={70} x2={400} y2={70} stroke="var(--hairline)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={(rc.thresholdY / 104) * 86} x2={400} y2={(rc.thresholdY / 104) * 86} stroke="var(--risk-critical)" strokeWidth={1.2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="#26332E" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
            </svg>
            <div style={{ marginTop: 7, font: "400 11.5px/1.5 var(--font-sans)", color: 'var(--ink-soft)' }}>{rc.narrative}</div>
          </div>
          <div>
            <SectionLabel>4 · DATA QUALITY</SectionLabel>
            <div className="warn-banner" style={{ marginBottom: 9 }}>
              <div className="mark">!</div>
              <div className="text">Field sync source unavailable since 14:02 IST on 12 Sep. Citizen queue figures are cached.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '7px 12px', font: "400 11px/1.35 var(--font-mono)", color: 'var(--ink-soft)' }}>
              <span>IMD AWS FEED</span>
              <span style={{ color: 'var(--risk-very-low)', textAlign: 'right' }}>OK · 14 / 14</span>
              <span>SATELLITE SOIL MOISTURE</span>
              <span style={{ color: 'var(--risk-very-low)', textAlign: 'right' }}>OK · 08:10</span>
              <span>CITIZEN FIELD SYNC</span>
              <span style={{ color: 'var(--warn-ink)', textAlign: 'right' }}>DEGRADED</span>
              <span>CONFIDENCE · NER-ML-042</span>
              <span style={{ color: 'var(--ink-faint)', textAlign: 'right' }}>N/A THIS RUN</span>
            </div>
          </div>
        </div>

        <div className="sr-footer" style={{ borderTop: '1px solid var(--ink)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.09em', color: 'var(--ink-muted)' }}>
              PREPARED BY
            </div>
            <div style={{ font: "400 12px/1.4 var(--font-sans)", color: 'var(--ink)' }}>
              R. Baruah · MSDMA State EOC
              <br />
              <span style={{ color: 'var(--ink-muted)' }}>Approver · issued 09:04 IST</span>
            </div>
          </div>
          <div style={{ width: 200, borderBottom: '1px solid #9BA39B', paddingBottom: 4, font: "500 11px/1 var(--font-mono)", letterSpacing: '0.09em', color: 'var(--ink-faint)', textAlign: 'center' }}>
            COUNTERSIGNATURE
          </div>
        </div>

        <div className="sr-disclaimer mono" style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ink-faint)' }}>
          Model output is decision support, not a forecast of certainty. Risk score, risk state, confidence and exposure are
          reported separately and must not be combined into a single index. Unvalidated horizons are excluded from this
          report.
        </div>
      </div>
    </div>
  );
}

function ReportKpi({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: 'var(--panel-bg-tint)', padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '0.09em', color: 'var(--ink-muted)' }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)', marginBottom: 9 }}>
      {children}
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="mono">
      <span style={{ width: 14, height: 10, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}
