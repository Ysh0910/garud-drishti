import { useEffect, useState } from 'react';
import { useAlerts, useApproveAlert, useResolveAlert } from '../../hooks/api';
import { riskBadgeClass } from '../../utils/risk';
import PanelStatus from '../common/PanelStatus';

const COLS = '96px minmax(0,1fr) 78px 104px 132px';

// Matches the header's demo authority identity (Header.tsx) — this console has no
// real auth yet, per Tasks/Yashwanth/tasks.md Phase 13 ("use a clearly marked demo
// authority identity rather than pretending the system is secured").
const CURRENT_USER = 'R. Baruah';

const STATE_DOT: Record<string, string> = {
  PENDING_APPROVAL: 'var(--risk-high)',
  CREATED: 'var(--risk-high)',
  ACTIVE: 'var(--good)',
  ESCALATED: 'var(--risk-critical)',
  RESOLVED: 'var(--ink-faint)',
};

const STATE_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'AWAITING',
  CREATED: 'AWAITING',
  ACTIVE: 'ACTIVE',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
};

export default function AlertCenterPanel() {
  const { data: alerts, isLoading, isError } = useAlerts();
  const approveAlert = useApproveAlert();
  const resolveAlert = useResolveAlert();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (alerts && alerts.length > 0 && expanded === null) setExpanded(alerts[0].alert_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="panel">
        <PanelStatus kind="loading" message="Loading alerts…" />
      </div>
    );
  }
  if (isError || !alerts) {
    return (
      <div className="panel">
        <PanelStatus kind="error" message="Alert center unavailable right now." />
      </div>
    );
  }

  const awaiting = alerts.filter((a) => a.state === 'PENDING_APPROVAL' || a.state === 'CREATED').length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div className="panel-title">ALERT CENTER</div>
          <div className="panel-subtle">
            {alerts.length} ACTIVE · {awaiting} AWAITING APPROVAL
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
        <div>STATE</div>
        <div>ACTION</div>
      </div>

      {alerts.map((alert) => {
        const isPending = alert.state === 'PENDING_APPROVAL' || alert.state === 'CREATED';
        const isActive = alert.state === 'ACTIVE' || alert.state === 'ESCALATED';
        const isOpen = expanded === alert.alert_id && !!alert.decisionTrail;
        return (
          <div
            key={alert.alert_id}
            style={{
              padding: '11px 18px',
              borderBottom: '1px solid var(--hairline-softer)',
              background: isPending && alert.severity === 'CRITICAL' ? 'var(--panel-bg-critical-row)' : 'transparent',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center' }}>
              <div className={riskBadgeClass(alert.severity)}>{alert.severity}</div>
              <button
                onClick={() => alert.decisionTrail && setExpanded(isOpen ? null : alert.alert_id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: alert.decisionTrail ? 'pointer' : 'default',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>
                  {alert.cell_id}
                  {alert.decisionTrail && <span style={{ color: 'var(--ink-faint)' }}> {isOpen ? '▾' : '▸'}</span>}
                </span>
                <span style={{ font: "400 11px/1 var(--font-sans)", color: 'var(--ink-faint)' }}>{alert.label}</span>
              </button>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
                {alert.created_label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, background: STATE_DOT[alert.state] }} />
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-soft)' }}>
                  {STATE_LABEL[alert.state]}
                </span>
              </div>
              {isPending && (
                <button
                  className={alert.severity === 'CRITICAL' ? 'btn btn-primary' : 'btn btn-outline'}
                  disabled={approveAlert.isPending}
                  onClick={() => approveAlert.mutate({ alertId: alert.alert_id, approverName: CURRENT_USER })}
                >
                  {approveAlert.isPending && approveAlert.variables?.alertId === alert.alert_id ? 'APPROVING…' : 'APPROVE'}
                </button>
              )}
              {isActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button
                    className="btn btn-outline"
                    disabled={resolveAlert.isPending}
                    onClick={() => resolveAlert.mutate({ alertId: alert.alert_id, resolverName: CURRENT_USER })}
                  >
                    {resolveAlert.isPending && resolveAlert.variables?.alertId === alert.alert_id ? 'RESOLVING…' : 'RESOLVE'}
                  </button>
                  {alert.approvedBy && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                      approved {alert.approvedBy} · {alert.approvedAtLabel}
                    </span>
                  )}
                </div>
              )}
              {alert.state === 'RESOLVED' && (
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.3 }}>
                  {alert.resolvedBy ?? alert.approvedBy} · {alert.resolvedAtLabel}
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
