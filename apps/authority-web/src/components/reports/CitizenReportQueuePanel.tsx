import { useEffect, useRef, useState } from 'react';
import { useReports } from '../../hooks/api';
import { useDashboardStore } from '../../store/dashboardStore';
import PanelStatus from '../common/PanelStatus';
import WarnBanner from '../common/WarnBanner';

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'badge badge-neutral',
  VERIFIED: 'badge badge-verified',
  REJECTED: 'badge badge-rejected',
  REVIEW: 'badge badge-neutral',
  PROBABLE: 'badge badge-neutral',
};

export default function CitizenReportQueuePanel() {
  const { reportFilter, setReportFilter, openReport } = useDashboardStore();
  const { data: reports, isLoading, isError } = useReports();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const allReports = reports ?? [];
  const rows = reportFilter === 'PENDING' ? allReports.filter((r) => r.status === 'PENDING') : allReports;

  useEffect(() => {
    setFocusedIndex(0);
  }, [reportFilter]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      const row = rows[focusedIndex];
      if (e.key === 'j' || e.key === 'J') setFocusedIndex((i) => Math.min(i + 1, rows.length - 1));
      else if (e.key === 'k' || e.key === 'K') setFocusedIndex((i) => Math.max(i - 1, 0));
      else if (e.key === 'Enter' && row) openReport(row.report_id);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rows, focusedIndex, openReport]);

  if (isLoading) {
    return (
      <div className="panel">
        <PanelStatus kind="loading" message="Loading citizen reports…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="panel">
        <PanelStatus kind="error" message="Citizen report queue unavailable right now." />
      </div>
    );
  }

  return (
    <div className="panel" ref={containerRef} tabIndex={0} style={{ outline: 'none' }}>
      <div className="panel-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div className="panel-title">CITIZEN REPORT QUEUE</div>
          <div className="panel-subtle">{allReports.filter((r) => r.status === 'PENDING').length} PENDING</div>
        </div>
        <div className="seg">
          <button
            onClick={() => setReportFilter('PENDING')}
            style={{
              background: reportFilter === 'PENDING' ? 'var(--header-bg-alt)' : 'var(--panel-bg)',
              color: reportFilter === 'PENDING' ? 'var(--header-ink)' : 'var(--ink-soft)',
            }}
          >
            PENDING
          </button>
          <button
            onClick={() => setReportFilter('ALL')}
            style={{
              background: reportFilter === 'ALL' ? 'var(--header-bg-alt)' : 'var(--panel-bg)',
              color: reportFilter === 'ALL' ? 'var(--header-ink)' : 'var(--ink-soft)',
            }}
          >
            ALL
          </button>
        </div>
      </div>

      <WarnBanner text="Data degraded — field sync source unavailable since 14:02 IST. Showing cached queue." />

      <div>
        {rows.map((r, i) => (
          <button
            key={r.report_id}
            onClick={() => openReport(r.report_id)}
            onMouseEnter={() => setFocusedIndex(i)}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px minmax(0,1fr) 112px 82px',
              gap: 12,
              alignItems: 'center',
              padding: '11px 18px',
              borderBottom: '1px solid var(--hairline-softer)',
              background: focusedIndex === i ? 'var(--panel-bg-row-alt)' : 'transparent',
              outline: focusedIndex === i ? '2px solid var(--header-bg)' : 'none',
              outlineOffset: -2,
              border: 'none',
              borderBottomStyle: 'solid',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div className="thumb-photo" style={{ height: 40 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>
                {r.report_id}
              </span>
              <span style={{ font: "400 11.5px/1.2 var(--font-sans)", color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.title}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                {r.cell_id} · REPORTED SEVERITY: {r.reported_severity}
              </span>
            </div>
            <div className={STATUS_CLASS[r.status]} style={{ justifySelf: 'start' }}>
              {r.status}
            </div>
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'right' }}>
              {r.time_label}
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--panel-bg-row-alt)', borderTop: '1px solid var(--hairline-soft)', flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: '0.09em', color: 'var(--ink-muted)' }}>
          KEYS
        </span>
        <KeyHint keys={['J', 'K']} label="move" />
        <KeyHint keys={['V']} label="verify" />
        <KeyHint keys={['R']} label="reject" />
        <KeyHint keys={['F']} label="follow-up" />
        <KeyHint keys={['↵']} label="open review" />
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-faint)' }}>
          Citizen severity is self-assessed · never a model input
        </span>
      </div>
    </div>
  );
}

function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }} className="mono">
      {keys.map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
      {label}
    </span>
  );
}
