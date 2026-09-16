import { useState } from 'react';
import { useReports, useVerifyReport, useZoneSummaries } from '../../hooks/api';
import { useDashboardStore } from '../../store/dashboardStore';
import { formatScore01, riskBadgeClass } from '../../utils/risk';
import WarnBanner from '../common/WarnBanner';

export default function ReportReviewModal() {
  const activeReportId = useDashboardStore((s) => s.activeReportId);
  const openReport = useDashboardStore((s) => s.openReport);
  const [note, setNote] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const { data: reports } = useReports();
  const { data: zones } = useZoneSummaries();
  const verifyReport = useVerifyReport();

  if (!activeReportId || !reports || reports.length === 0) return null;
  const allReports = reports;
  const index = allReports.findIndex((r) => r.report_id === activeReportId);
  const report = allReports[index] ?? allReports[0];
  const pendingCount = allReports.filter((r) => r.status === 'PENDING').length;

  const zone = zones?.find((z) => z.cell_id === report.cell_id);
  const nearbyScore = zone ? formatScore01(zone.risk_score) : null;
  const nearbyLevel = zone?.risk_level ?? null;

  function go(delta: number) {
    const next = (index + delta + allReports.length) % allReports.length;
    openReport(allReports[next].report_id);
    setNote('');
    setRejectError(null);
  }

  function decide(action: 'VERIFY' | 'REJECT' | 'MARK_PROBABLE') {
    // Backend requires a non-empty rejection_reason for REJECT — contracts/reports.md.
    if (action === 'REJECT' && !note.trim()) {
      setRejectError('A reason is required to reject a report — add one in the note field above.');
      return;
    }
    setRejectError(null);
    verifyReport.mutate(
      { reportId: report.report_id, action, rejectionReason: action === 'REJECT' ? note.trim() : undefined },
      { onSuccess: () => openReport(null) },
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(27,33,29,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 24,
      }}
      onClick={() => openReport(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 880, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', background: 'var(--panel-bg)', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--header-bg)', color: 'var(--header-ink)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ font: "600 13px/1 var(--font-sans)", letterSpacing: '0.06em' }}>REPORT REVIEW</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--header-ink-dim)' }}>
              {report.report_id} · {index + 1} of {pendingCount} pending
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="mono" onClick={() => go(-1)} style={{ background: 'transparent', border: '1px solid rgba(157,179,166,.5)', color: 'var(--header-ink)', padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>
              ← PREV
            </button>
            <button className="mono" onClick={() => go(1)} style={{ background: 'transparent', border: '1px solid rgba(157,179,166,.5)', color: 'var(--header-ink)', padding: '5px 9px', fontSize: 11, cursor: 'pointer' }}>
              NEXT →
            </button>
            <button onClick={() => openReport(null)} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--header-ink-dim)', fontSize: 16, cursor: 'pointer', font: 'inherit' }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '368px minmax(0,1fr)', gap: 1, background: 'var(--hairline-soft)' }}>
          <div style={{ background: 'var(--panel-bg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="thumb-photo" style={{ height: 286, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 10 }}>
              <div style={{ alignSelf: 'flex-start', background: 'rgba(252,251,247,.92)', border: '1px solid var(--border-mid)', padding: '4px 7px' }} className="mono">
                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>SUBMITTED PHOTO 1 / 1</span>
              </div>
              <div className="mono" style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
                DROP CITIZEN PHOTO HERE
                <br />
                EXIF {report.time_label} · 3024 × 4032
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 6, borderTop: '1px solid var(--hairline-soft)' }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>
                GPS (DEVICE)
              </div>
              <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.4, color: 'var(--ink)' }}>
                {report.gps_label}
                <br />
                <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>±8 m · captured on-device</span>
              </div>
              <div className="thumb-photo mono" style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink-muted)' }}>
                LOCATION INSET · 500 m
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--panel-bg)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="eyebrow">CATEGORY</div>
                  <div style={{ font: "600 15px/1.2 var(--font-sans)", color: 'var(--ink)' }}>{report.title}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {report.submitted_label}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                  <div className="eyebrow">REPORTED SEVERITY</div>
                  <div className="badge badge-lg badge-neutral">{report.reported_severity}</div>
                  <div style={{ font: "400 11px/1.4 var(--font-sans)", color: 'var(--ink-faint)', maxWidth: 174, textAlign: 'right' }}>
                    Self-assessed by the citizen. Not a model output.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div className="eyebrow">DESCRIPTION</div>
                <div style={{ font: "400 12.5px/1.6 var(--font-sans)", color: 'var(--ink)' }}>{report.description}</div>
              </div>
            </div>

            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.11em', color: 'var(--ink-soft)' }}>
                NEARBY RISK CONTEXT
              </div>
              <div className="grid-divider" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', border: '1px solid var(--hairline-soft)' }}>
                <div style={{ background: 'var(--panel-bg-tint)', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
                    ZONE
                  </span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    {report.cell_id}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    containing cell
                  </span>
                </div>
                <div style={{ background: 'var(--panel-bg-tint)', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
                    MODEL RISK STATE
                  </span>
                  {nearbyLevel ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className={riskBadgeClass(nearbyLevel)} style={{ width: 11, height: 11, padding: 0 }} />
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                        {nearbyLevel.replace('_', ' ')}
                      </span>
                    </div>
                  ) : (
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                      N/A
                    </span>
                  )}
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    score {nearbyScore ?? 'N/A'} · conf. N/A
                  </span>
                </div>
                <div style={{ background: 'var(--panel-bg-tint)', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
                    RAIN, 72 h
                  </span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    412 mm
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    218% of normal
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="mono">
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>3 other reports within 2 km, last 24 h</span>
                  <a href="/" style={{ fontSize: 11.5, fontWeight: 500 }}>
                    SHOW ON MAP →
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="mono">
                  <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Nearest asset: NH-6 km 41 · 140 m downslope</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>PWD MEGHALAYA</span>
                </div>
              </div>
            </div>

            <WarnBanner text="Data degraded — automated image checks unavailable. Assess this photo manually." />

            <div style={{ marginTop: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted)' }}>
                  REVIEWER NOTE (LOGGED WITH DECISION)
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context for the field team…"
                  style={{ border: '1px solid var(--border-mid)', background: '#FDFCF9', padding: '9px 10px', font: "400 11.5px/1.4 var(--font-sans)", color: 'var(--ink)', minHeight: 34, resize: 'vertical' }}
                />
              </div>
              {report.status === 'PENDING' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)', gap: 9 }}>
                    <button className="btn btn-primary" disabled={verifyReport.isPending} onClick={() => decide('VERIFY')}>
                      {verifyReport.isPending && verifyReport.variables?.action === 'VERIFY' ? 'VERIFYING…' : 'VERIFY REPORT'}
                    </button>
                    <button className="btn btn-outline" disabled={verifyReport.isPending} onClick={() => decide('MARK_PROBABLE')}>
                      {verifyReport.isPending && verifyReport.variables?.action === 'MARK_PROBABLE' ? 'MARKING…' : 'FOLLOW-UP'}
                    </button>
                    <button className="btn btn-danger-outline" disabled={verifyReport.isPending} onClick={() => decide('REJECT')}>
                      {verifyReport.isPending && verifyReport.variables?.action === 'REJECT' ? 'REJECTING…' : 'REJECT'}
                    </button>
                  </div>
                  {rejectError && (
                    <div className="mono" style={{ fontSize: 11, color: 'var(--warn-text)' }}>
                      {rejectError}
                    </div>
                  )}
                  <div className="mono" style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-faint)' }}>
                    Verification records the report as field evidence. It does not change the model risk state for {report.cell_id}.
                    "Follow-up" marks the report PROBABLE — the real API has no separate follow-up action.
                  </div>
                </>
              ) : (
                <div className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Already <strong>{report.status}</strong> — no further action needed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
