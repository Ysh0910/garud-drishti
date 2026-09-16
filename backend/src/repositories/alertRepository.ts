import { query } from '../db/client';
import { RiskLevel, AlertState } from '../types';
import { randomUUID } from 'crypto';

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
  notification_channel: string;
  notification_delivery_status: string;
  notification_sent_at: Date | null;
}

export interface CreateAlertData {
  alert_id?: string;
  cell_id: string | null;
  zone_name?: string | null;
  severity: RiskLevel;
  state?: AlertState;
  trigger_reason: string;
  trigger_rule: string;
  risk_score_at_creation: number;
  risk_score_current?: number | null;
  approved_by?: string | null;
  approved_at?: Date | null;
  notification_channel?: string;
  notification_delivery_status?: string;
  notification_sent_at?: Date | null;
}

export interface ListAlertsFilter {
  state?: AlertState;
  severity?: RiskLevel;
  cell_id?: string;
  since?: Date;
  limit?: number;
  offset?: number;
}

export class AlertRepository {
  private inMemoryAlerts: Map<string, AlertRecord> = new Map();

  constructor() {
    this.seedInMemoryDefaults();
  }

  private seedInMemoryDefaults(): void {
    const seed1: AlertRecord = {
      alert_id: 'a1000000-0000-4000-8000-000000000001',
      cell_id: 'cell_sk_gangtok_01',
      zone_name: 'Gangtok East Corridor',
      severity: 'HIGH',
      state: 'ACTIVE',
      trigger_reason: 'Antecedent 72h rainfall exceeded critical slope threshold (148mm)',
      trigger_rule: 'RULE_2_EARLY_WARNING',
      risk_score_at_creation: 78,
      risk_score_current: 82,
      created_at: new Date(Date.now() - 3600000 * 4),
      updated_at: new Date(Date.now() - 3600000 * 2),
      approved_by: 'OFFICER_SDMA_EAST_SIKKIM',
      approved_at: new Date(Date.now() - 3600000 * 3),
      resolved_at: null,
      notification_channel: 'SIMULATED',
      notification_delivery_status: 'SIMULATED',
      notification_sent_at: new Date(Date.now() - 3600000 * 3),
    };

    const seed2: AlertRecord = {
      alert_id: 'a1000000-0000-4000-8000-000000000002',
      cell_id: 'cell_mz_champhai_01',
      zone_name: 'Champhai Border Slope',
      severity: 'CRITICAL',
      state: 'PENDING_APPROVAL',
      trigger_reason: 'Dynamic risk reached 91 with severe deformation indicators',
      trigger_rule: 'RULE_1_CRITICAL',
      risk_score_at_creation: 91,
      risk_score_current: 91,
      created_at: new Date(Date.now() - 1800000),
      updated_at: new Date(Date.now() - 1800000),
      approved_by: null,
      approved_at: null,
      resolved_at: null,
      notification_channel: 'SIMULATED',
      notification_delivery_status: 'PENDING',
      notification_sent_at: null,
    };

    this.inMemoryAlerts.set(seed1.alert_id, seed1);
    this.inMemoryAlerts.set(seed2.alert_id, seed2);
  }

  /**
   * Create an alert record.
   */
  async create(data: CreateAlertData): Promise<AlertRecord> {
    const alertId = data.alert_id || randomUUID();
    const now = new Date();

    const record: AlertRecord = {
      alert_id: alertId,
      cell_id: data.cell_id,
      zone_name: data.zone_name || null,
      severity: data.severity,
      state: data.state || 'PENDING_APPROVAL',
      trigger_reason: data.trigger_reason,
      trigger_rule: data.trigger_rule,
      risk_score_at_creation: data.risk_score_at_creation,
      risk_score_current: data.risk_score_current ?? data.risk_score_at_creation,
      created_at: now,
      updated_at: now,
      approved_by: data.approved_by || null,
      approved_at: data.approved_at || null,
      resolved_at: null,
      notification_channel: data.notification_channel || 'SIMULATED',
      notification_delivery_status: data.notification_delivery_status || 'PENDING',
      notification_sent_at: data.notification_sent_at || null,
    };

    try {
      const res = await query(
        `INSERT INTO alerts (
           alert_id, cell_id, zone_name, severity, state, trigger_reason, trigger_rule,
           risk_score_at_creation, risk_score_current, created_at, updated_at,
           approved_by, approved_at, resolved_at, notification_channel,
           notification_delivery_status, notification_sent_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          record.alert_id,
          record.cell_id,
          record.zone_name,
          record.severity,
          record.state,
          record.trigger_reason,
          record.trigger_rule,
          record.risk_score_at_creation,
          record.risk_score_current,
          record.created_at,
          record.updated_at,
          record.approved_by,
          record.approved_at,
          record.resolved_at,
          record.notification_channel,
          record.notification_delivery_status,
          record.notification_sent_at,
        ]
      );
      if (res.rows.length > 0) {
        this.inMemoryAlerts.set(alertId, record);
        return res.rows[0] as AlertRecord;
      }
    } catch (err) {
      console.warn('[alertRepository] Database insert failed, using in-memory store:', err);
    }

    this.inMemoryAlerts.set(alertId, record);
    return record;
  }

  /**
   * Find alert by ID.
   */
  async findById(alertId: string): Promise<AlertRecord | null> {
    try {
      const res = await query(
        `SELECT * FROM alerts WHERE alert_id = $1`,
        [alertId]
      );
      if (res.rows.length > 0) {
        return res.rows[0] as AlertRecord;
      }
    } catch (err) {
      console.warn('[alertRepository] Database findById failed, using in-memory store:', err);
    }

    return this.inMemoryAlerts.get(alertId) || null;
  }

  /**
   * Find active or pending alert for a cell to prevent duplicates.
   */
  async findActiveByCellId(cellId: string): Promise<AlertRecord | null> {
    try {
      const res = await query(
        `SELECT * FROM alerts
         WHERE cell_id = $1 AND state IN ('PENDING_APPROVAL', 'ACTIVE', 'ESCALATED')
         ORDER BY created_at DESC
         LIMIT 1`,
        [cellId]
      );
      if (res.rows.length > 0) {
        return res.rows[0] as AlertRecord;
      }
    } catch (err) {
      console.warn('[alertRepository] Database findActiveByCellId failed, checking in-memory store:', err);
    }

    for (const alert of this.inMemoryAlerts.values()) {
      if (
        alert.cell_id === cellId &&
        (alert.state === 'PENDING_APPROVAL' || alert.state === 'ACTIVE' || alert.state === 'ESCALATED')
      ) {
        return alert;
      }
    }

    return null;
  }

  /**
   * List alerts with filters.
   */
  async list(filter: ListAlertsFilter): Promise<{ alerts: AlertRecord[]; total: number }> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (filter.state) {
        conditions.push(`state = $${idx++}`);
        values.push(filter.state);
      }
      if (filter.severity) {
        conditions.push(`severity = $${idx++}`);
        values.push(filter.severity);
      }
      if (filter.cell_id) {
        conditions.push(`cell_id = $${idx++}`);
        values.push(filter.cell_id);
      }
      if (filter.since) {
        conditions.push(`created_at >= $${idx++}`);
        values.push(filter.since);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countRes = await query(
        `SELECT COUNT(*) AS total FROM alerts ${whereClause}`,
        values
      );
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      const limit = filter.limit || 50;
      const offset = filter.offset || 0;

      values.push(limit);
      values.push(offset);

      const dataRes = await query(
        `SELECT * FROM alerts ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        values
      );

      return {
        alerts: dataRes.rows as AlertRecord[],
        total,
      };
    } catch (err) {
      console.warn('[alertRepository] Database list failed, using in-memory store:', err);
    }

    let all = Array.from(this.inMemoryAlerts.values());

    if (filter.state) {
      all = all.filter((a) => a.state === filter.state);
    }
    if (filter.severity) {
      all = all.filter((a) => a.severity === filter.severity);
    }
    if (filter.cell_id) {
      all = all.filter((a) => a.cell_id === filter.cell_id);
    }
    if (filter.since) {
      all = all.filter((a) => a.created_at >= filter.since!);
    }

    all.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const total = all.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const paginated = all.slice(offset, offset + limit);

    return {
      alerts: paginated,
      total,
    };
  }

  /**
   * Update alert state (acknowledge, resolve, escalate).
   */
  async updateState(
    alertId: string,
    updates: {
      state: AlertState;
      approved_by?: string | null;
      approved_at?: Date | null;
      resolved_at?: Date | null;
      risk_score_current?: number | null;
      notification_channel?: string;
      notification_delivery_status?: string;
      notification_sent_at?: Date | null;
    }
  ): Promise<AlertRecord | null> {
    const now = new Date();
    try {
      const res = await query(
        `UPDATE alerts
         SET 
           state = $2,
           updated_at = $3,
           approved_by = COALESCE($4, approved_by),
           approved_at = COALESCE($5, approved_at),
           resolved_at = COALESCE($6, resolved_at),
           risk_score_current = COALESCE($7, risk_score_current),
           notification_channel = COALESCE($8, notification_channel),
           notification_delivery_status = COALESCE($9, notification_delivery_status),
           notification_sent_at = COALESCE($10, notification_sent_at)
         WHERE alert_id = $1
         RETURNING *`,
        [
          alertId,
          updates.state,
          now,
          updates.approved_by || null,
          updates.approved_at || null,
          updates.resolved_at || null,
          updates.risk_score_current ?? null,
          updates.notification_channel || null,
          updates.notification_delivery_status || null,
          updates.notification_sent_at || null,
        ]
      );
      if (res.rows.length > 0) {
        const record = res.rows[0] as AlertRecord;
        this.inMemoryAlerts.set(alertId, record);
        return record;
      }
    } catch (err) {
      console.warn('[alertRepository] Database updateState failed, updating in-memory store:', err);
    }

    const existing = this.inMemoryAlerts.get(alertId);
    if (!existing) return null;

    const updated: AlertRecord = {
      ...existing,
      state: updates.state,
      updated_at: now,
      approved_by: updates.approved_by !== undefined ? updates.approved_by : existing.approved_by,
      approved_at: updates.approved_at !== undefined ? updates.approved_at : existing.approved_at,
      resolved_at: updates.resolved_at !== undefined ? updates.resolved_at : existing.resolved_at,
      risk_score_current:
        updates.risk_score_current !== undefined ? updates.risk_score_current : existing.risk_score_current,
      notification_channel:
        updates.notification_channel !== undefined ? updates.notification_channel : existing.notification_channel,
      notification_delivery_status:
        updates.notification_delivery_status !== undefined
          ? updates.notification_delivery_status
          : existing.notification_delivery_status,
      notification_sent_at:
        updates.notification_sent_at !== undefined
          ? updates.notification_sent_at
          : existing.notification_sent_at,
    };

    this.inMemoryAlerts.set(alertId, updated);
    return updated;
  }

  // --- Canonical Repository Layer Aliases ---
  async createAlert(data: CreateAlertData): Promise<AlertRecord> {
    return this.create(data);
  }

  async findAlerts(filter: ListAlertsFilter = {}): Promise<{ alerts: AlertRecord[]; total: number }> {
    return this.list(filter);
  }

  async findActiveAlertForCell(cellId: string): Promise<AlertRecord | null> {
    return this.findActiveByCellId(cellId);
  }

  async acknowledgeAlert(alertId: string, approvedBy: string = 'DISASTER_MGMT_OFFICER'): Promise<AlertRecord | null> {
    return this.updateState(alertId, {
      state: 'ACTIVE',
      approved_by: approvedBy,
      approved_at: new Date(),
      notification_channel: 'SIMULATED',
      notification_delivery_status: 'SIMULATED',
      notification_sent_at: new Date(),
    });
  }

  async resolveAlert(alertId: string): Promise<AlertRecord | null> {
    return this.updateState(alertId, {
      state: 'RESOLVED',
      resolved_at: new Date(),
    });
  }
}

export const alertRepository = new AlertRepository();

