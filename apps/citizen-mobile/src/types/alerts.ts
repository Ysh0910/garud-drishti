/**
 * Alert Types for Citizen Mobile Application
 * Synchronized with contracts/alerts.md and backend alert responses.
 */

import { RiskLevel } from './enums';

export type AlertState = 'CREATED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ESCALATED' | 'RESOLVED';

export interface NotificationSummary {
  channel: string;
  sent_at: string | null;
  recipient_count: number | null;
  delivery_status: 'PENDING' | 'SENT' | 'FAILED' | 'SIMULATED';
}

export interface AlertResponse {
  alert_id: string;
  cell_id: string | null;
  zone_name: string | null;
  severity: RiskLevel;
  state: AlertState;
  trigger_reason: string;
  trigger_rule: string;
  risk_score_at_creation: number;
  risk_score_current: number | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  resolved_at: string | null;
  notification: NotificationSummary | null;
}
