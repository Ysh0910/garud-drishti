import { useState } from 'react';
import { ALERT_ROWS } from '../../mocks/alerts';
import { riskBadgeClass } from '../../utils/risk';

const COLS = '96px minmax(0,1fr) 78px 104px 132px';

export default function AlertCenterPanel() {
  const [expanded, setExpanded] = useState<string | null>(ALERT_ROWS[0]?.alert_id ?? null);
  const awaiting = ALERT_ROWS.filter((a) => a.approval === 'AWAITING').length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div className="panel-title">ALERT CENTER</div>
          <div className="panel-subtle">
            {ALERT_ROWS.length} ACTIVE · {awaiting} AWAITING APPROVAL
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)', border: '1px solid var(--border-mid)', padding: '5px 9px' }}>
          SIMULATION MODE
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLS,
          gap: 10,
          padding: '8px 18px',
          background: 'var(--panel-bg-row-alt)',
          borderBottom: '1px solid var(--hairline-soft)',
          font: "500 11px/1 var(--font-mono)",
          letterSpacing: '0.09em',
          color: 'var(--ink-muted)',
        }}
      >
        <div>SEVERITY</div>
        <div>ZONE</div>
        <div>CREATED</div>
        <div>APPROVAL</div>
        <div>DECISION TRAIL</div>
      </div>

      {ALERT_ROWS.map((alert) => {
        const isOpen = expanded === alert.alert_id && !!alert.decisionTrail;
        return (
          <div
            key={alert.alert_id}
            style={{
              padding: '11px 18px',
              borderBottom: '1px solid var(--hairline-softer)',
              background: alert.approval === 'AWAITING' && alert.severity === 'CRITICAL' ? 'var(--panel-bg-critical-row)' : 'transparent',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center' }}>
              <div className={riskBadgeClass(alert.severity)}>{alert.severity}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>
                  {alert.cell_id}
                </span>
                <span style={{ font: "400 11px/1 var(--font-sans)", color: 'var(--ink-faint)' }}>{alert.label}</span>
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                {alert.created_label}
              </div>
              {alert.approval === 'AWAITING' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, background: 'var(--risk-high)' }} />
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-soft)' }}>
                    AWAITING
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, background: 'var(--risk-very-low)' }} />
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-soft)' }}>
                    APPROVED
                  </span>
                </div>
              )}
              {alert.approval === 'AWAITING' ? (
                <button
                  className={alert.severity === 'CRITICAL' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => alert.decisionTrail && setExpanded(isOpen ? null : alert.alert_id)}
                >
                  REVIEW → APPROVE
                </button>
              ) : (
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.3 }}>
                  {alert.approvedBy} · {alert.approvedAtLabel}
                  {alert.runLabel && (
                    <>
                      <br />
                      RUN {alert.runLabel}
                    </>
                  )}
                </span>
              )}
            </div>
            {isOpen && alert.decisionTrail && (
              <div style={{ margin: '9px 0 0 0', padding: '9px 0 0 106px', borderTop: '1px dashed #E0DCD0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {alert.decisionTrail.map((event, i) => (
                  <div key={i} className="mono" style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--ink-muted)' }}>
                    {event.time_label} · {event.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ padding: '11px 18px', font: "400 11.5px/1.5 var(--font-mono)", color: 'var(--ink-faint)' }}>
        Approval issues a simulated dissemination record only. No public message is sent from this console.
      </div>
    </div>
  );
}
