import type { AlertRow } from '../types/zone';

/**
 * SYNTHETIC DEMO DATA — simulation mode only. No public message is sent from this console.
 * Mutated in place by mockApi's approveAlert/resolveAlert (this is the in-memory "backend"
 * for the mock session) — do not treat this array as immutable elsewhere.
 */
export const ALERT_ROWS: AlertRow[] = [
  {
    alert_id: 'ALT-4512',
    severity: 'CRITICAL',
    cell_id: 'NER-ML-042',
    label: 'Sohra block · 4,820 exposed',
    created_label: '14:29 IST',
    state: 'PENDING_APPROVAL',
    decisionTrail: [
      { time_label: '14:29', text: 'DRAFTED BY MODEL RUN 2026-09-13T14:30Z · supersedes alert 4471 · 09:40' },
      { time_label: '14:31', text: 'ROUTED TO MSDMA APPROVER QUEUE · SLA 15 MIN' },
      { time_label: '14:33', text: 'VIEWED BY R. BARUAH · NO DECISION RECORDED' },
    ],
  },
  {
    alert_id: 'ALT-4498',
    severity: 'HIGH',
    cell_id: 'NER-MZ-118',
    label: 'Serchhip · 1,340 exposed',
    created_label: '13:55 IST',
    state: 'PENDING_APPROVAL',
  },
  {
    alert_id: 'ALT-4471',
    severity: 'HIGH',
    cell_id: 'NER-AR-007',
    label: 'Dibang Valley · 610 exposed',
    created_label: '12:10 IST',
    state: 'ACTIVE',
    approvedBy: 'R. Baruah',
    approvedAtLabel: '12:14',
    runLabel: '…T12:00Z',
  },
  {
    alert_id: 'ALT-4402',
    severity: 'MODERATE',
    cell_id: 'NER-SK-023',
    label: 'Mangan · 2,100 exposed',
    created_label: '09:40 IST',
    state: 'RESOLVED',
    approvedBy: 'D. Lyngdoh',
    approvedAtLabel: '09:52',
    resolvedBy: 'D. Lyngdoh',
    resolvedAtLabel: '13:10',
    runLabel: '…T09:30Z',
  },
];
