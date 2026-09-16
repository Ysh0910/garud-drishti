import { alertRepository, AlertRecord, ListAlertsFilter } from '../repositories/alertRepository';
import { riskRepository } from '../repositories/riskRepository';
import { RiskLevel, AlertState } from '../types';
import { notFound, badRequest, conflict } from '../utils/errors';

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

export function recordToAlertResponse(record: AlertRecord): AlertResponse {
  const isApproved = record.state === 'ACTIVE' || record.state === 'ESCALATED' || record.state === 'RESOLVED';

  const notification: NotificationSummary | null = isApproved
    ? {
        channel: record.notification_channel || 'SIMULATED',
        sent_at: record.notification_sent_at ? record.notification_sent_at.toISOString() : null,
        recipient_count: record.state === 'RESOLVED' ? null : 1250, // Simulated recipient count
        delivery_status: (record.notification_delivery_status as any) || 'SIMULATED',
      }
    : {
        channel: 'SIMULATED',
        sent_at: null,
        recipient_count: null,
        delivery_status: 'PENDING',
      };

  return {
    alert_id: record.alert_id,
    cell_id: record.cell_id,
    zone_name: record.zone_name,
    severity: record.severity,
    state: record.state,
    trigger_reason: record.trigger_reason,
    trigger_rule: record.trigger_rule,
    risk_score_at_creation: record.risk_score_at_creation,
    risk_score_current: record.risk_score_current,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
    approved_by: record.approved_by,
    approved_at: record.approved_at ? record.approved_at.toISOString() : null,
    resolved_at: record.resolved_at ? record.resolved_at.toISOString() : null,
    notification,
  };
}

export class AlertService {
  /**
   * Manual alert creation by authorities (POST /api/v1/alerts).
   */
  async createManualAlert(data: {
    cell_id: string;
    severity: RiskLevel;
    trigger_reason: string;
    zone_name?: string;
  }): Promise<AlertResponse> {
    let currentRisk = 75;
    let zoneName = data.zone_name;

    try {
      const cell = await riskRepository.findById(data.cell_id);
      if (cell) {
        currentRisk = cell.current_risk;
        if (!zoneName) zoneName = `Zone ${cell.cell_id}`;
      }
    } catch {
      // Fallback
    }

    const record = await alertRepository.create({
      cell_id: data.cell_id,
      zone_name: zoneName || `Zone ${data.cell_id}`,
      severity: data.severity,
      state: 'PENDING_APPROVAL',
      trigger_reason: data.trigger_reason,
      trigger_rule: 'MANUAL',
      risk_score_at_creation: currentRisk,
      risk_score_current: currentRisk,
    });

    return recordToAlertResponse(record);
  }

  /**
   * Evaluate automated threshold rules for a risk zone.
   */
  async evaluateZoneRules(
    cellId: string,
    currentRisk: number,
    forecast24h: number | null = null,
    zoneName?: string
  ): Promise<AlertResponse | null> {
    const existingActive = await alertRepository.findActiveByCellId(cellId);

    // Rule 1: Critical Threshold Breach (current_risk >= 81)
    if (currentRisk >= 81) {
      if (existingActive) {
        if (existingActive.state === 'ACTIVE' && existingActive.severity !== 'CRITICAL') {
          // Rule 3: Rapid Escalation
          const escalated = await alertRepository.updateState(existingActive.alert_id, {
            state: 'ESCALATED',
            risk_score_current: currentRisk,
          });
          return escalated ? recordToAlertResponse(escalated) : null;
        }
        // Deduplication: already active in critical state
        return recordToAlertResponse(existingActive);
      }

      const created = await alertRepository.create({
        cell_id: cellId,
        zone_name: zoneName || `Zone ${cellId}`,
        severity: 'CRITICAL',
        state: 'PENDING_APPROVAL',
        trigger_reason: `Critical hazard risk threshold breached (${currentRisk}/100)`,
        trigger_rule: 'RULE_1_CRITICAL',
        risk_score_at_creation: currentRisk,
      });
      return recordToAlertResponse(created);
    }

    // Rule 2: Early Warning (current_risk < 81 and forecast_24h >= 81)
    if (currentRisk < 81 && forecast24h !== null && forecast24h >= 81) {
      if (existingActive) {
        return recordToAlertResponse(existingActive);
      }

      const created = await alertRepository.create({
        cell_id: cellId,
        zone_name: zoneName || `Zone ${cellId}`,
        severity: 'HIGH',
        state: 'PENDING_APPROVAL',
        trigger_reason: `Early Warning: 24-hour risk forecast projects critical levels (${forecast24h}/100)`,
        trigger_rule: 'RULE_2_EARLY_WARNING',
        risk_score_at_creation: currentRisk,
      });
      return recordToAlertResponse(created);
    }

    return null;
  }

  /**
   * Acknowledge / Approve alert (POST /api/v1/alerts/:alert_id/acknowledge).
   */
  async acknowledgeAlert(alertId: string, approvedBy: string = 'DISASTER_MGMT_OFFICER'): Promise<AlertResponse> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw notFound(`Alert '${alertId}'`);
    }

    if (alert.state !== 'PENDING_APPROVAL') {
      throw conflict(`Alert '${alertId}' cannot be approved in state '${alert.state}'. Must be PENDING_APPROVAL.`);
    }

    const now = new Date();
    const updated = await alertRepository.updateState(alertId, {
      state: 'ACTIVE',
      approved_by: approvedBy,
      approved_at: now,
      notification_channel: 'SIMULATED',
      notification_delivery_status: 'SIMULATED',
      notification_sent_at: now,
    });

    if (!updated) {
      throw notFound(`Alert '${alertId}'`);
    }

    return recordToAlertResponse(updated);
  }

  /**
   * Resolve an alert (POST /api/v1/alerts/:alert_id/resolve).
   */
  async resolveAlert(alertId: string, _resolutionReason?: string): Promise<AlertResponse> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw notFound(`Alert '${alertId}'`);
    }

    if (alert.state === 'RESOLVED') {
      return recordToAlertResponse(alert);
    }

    if (alert.state === 'PENDING_APPROVAL') {
      throw badRequest(`Cannot resolve an unapproved alert '${alertId}'. Acknowledge it first or discard.`);
    }

    const now = new Date();
    const updated = await alertRepository.updateState(alertId, {
      state: 'RESOLVED',
      resolved_at: now,
    });

    if (!updated) {
      throw notFound(`Alert '${alertId}'`);
    }

    return recordToAlertResponse(updated);
  }

  /**
   * List alerts with filters.
   */
  async listAlerts(filter: ListAlertsFilter): Promise<{ alerts: AlertResponse[]; total: number }> {
    const { alerts, total } = await alertRepository.list(filter);
    return {
      alerts: alerts.map(recordToAlertResponse),
      total,
    };
  }

  /**
   * Get alert by ID.
   */
  async getAlertById(alertId: string): Promise<AlertResponse> {
    const alert = await alertRepository.findById(alertId);
    if (!alert) {
      throw notFound(`Alert '${alertId}'`);
    }
    return recordToAlertResponse(alert);
  }
}

export const alertService = new AlertService();
