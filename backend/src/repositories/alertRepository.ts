import { query } from '../db/client';
import { AlertState, RiskLevel } from '../types/enums';

export interface CreateAlertDTO {
  cell_id?: string | null;
  zone_name?: string | null;
  severity: RiskLevel;
  trigger_reason: string;
  trigger_rule: string;
  risk_score_at_creation: number;
}

export interface AlertRecord {
  alert_id: string;
  cell_id: string | null;
  zone_name: string | null;
  severity: RiskLevel;
  state: AlertState;
  trigger_reason: string;
  trigger_rule: string;
  risk_score_at_creation: number;
  risk_score_current: number | null;
  created_at: Date;
  updated_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
  resolved_at: Date | null;
  notification_channel: string | null;
  notification_delivery_status: string | null;
  notification_sent_at: Date | null;
}

export interface AlertFilter {
  state?: AlertState;
  severity?: RiskLevel;
  cell_id?: string;
  since?: Date;
}

export class AlertRepository {
  /**
   * Insert a new alert candidate.
   */
  async createAlert(input: CreateAlertDTO): Promise<AlertRecord> {
    const res = await query<AlertRecord>(
      `INSERT INTO alerts (
        cell_id, zone_name, severity, state, trigger_reason, trigger_rule,
        risk_score_at_creation, risk_score_current, notification_channel, notification_delivery_status
      ) VALUES (
        $1, $2, $3, 'CREATED', $4, $5, $6, $6, 'SIMULATED', 'PENDING'
      )
      RETURNING *`,
      [
        input.cell_id || null,
        input.zone_name || null,
        input.severity,
        input.trigger_reason,
        input.trigger_rule,
        input.risk_score_at_creation,
      ],
    );

    return res.rows[0];
  }

  /**
   * Find alert by UUID.
   */
  async findById(alertId: string): Promise<AlertRecord | null> {
    const res = await query<AlertRecord>(
      `SELECT * FROM alerts WHERE alert_id = $1`,
      [alertId],
    );
    return res.rows[0] || null;
  }

  /**
   * Find existing active or pending alert for a cell to prevent duplication.
   */
  async findActiveAlertForCell(cellId: string): Promise<AlertRecord | null> {
    const res = await query<AlertRecord>(
      `SELECT * FROM alerts 
       WHERE cell_id = $1 
         AND state IN ('CREATED', 'PENDING_APPROVAL', 'ACTIVE', 'ESCALATED')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [cellId],
    );
    return res.rows[0] || null;
  }

  /**
   * Query filtered alerts.
   */
  async findAlerts(filter: AlertFilter): Promise<{ alerts: AlertRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.state) {
      params.push(filter.state);
      conditions.push(`state = $${params.length}`);
    }

    if (filter.severity) {
      params.push(filter.severity);
      conditions.push(`severity = $${params.length}`);
    }

    if (filter.cell_id) {
      params.push(filter.cell_id);
      conditions.push(`cell_id = $${params.length}`);
    }

    if (filter.since) {
      params.push(filter.since);
      conditions.push(`created_at >= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM alerts ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const rowsRes = await query<AlertRecord>(
      `SELECT * FROM alerts ${whereClause} ORDER BY created_at DESC LIMIT 100`,
      params,
    );

    return { alerts: rowsRes.rows, total };
  }

  /**
   * Acknowledge / approve an alert (transition PENDING_APPROVAL -> ACTIVE).
   */
  async acknowledgeAlert(alertId: string, approvedBy?: string): Promise<AlertRecord | null> {
    const res = await query<AlertRecord>(
      `UPDATE alerts
       SET 
         state = 'ACTIVE',
         approved_by = $2,
         approved_at = NOW(),
         notification_delivery_status = 'SIMULATED',
         notification_sent_at = NOW(),
         updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId, approvedBy || 'AUTHORITY_OFFICER'],
    );

    return res.rows[0] || null;
  }

  /**
   * Resolve an alert (transition to RESOLVED).
   */
  async resolveAlert(alertId: string): Promise<AlertRecord | null> {
    const res = await query<AlertRecord>(
      `UPDATE alerts
       SET 
         state = 'RESOLVED',
         resolved_at = NOW(),
         updated_at = NOW()
       WHERE alert_id = $1
       RETURNING *`,
      [alertId],
    );

    return res.rows[0] || null;
  }
}

export const alertRepository = new AlertRepository();
