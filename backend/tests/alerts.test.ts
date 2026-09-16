import request from 'supertest';
import { createApp } from '../src/app';
import { alertService } from '../src/services/alertService';
import { alertRepository } from '../src/repositories/alertRepository';

const app = createApp();

describe('Phase 10: Alert Lifecycle & Stateful Engine', () => {
  describe('GET /api/v1/alerts', () => {
    it('returns a list of alerts with total count', async () => {
      const res = await request(app).get('/api/v1/alerts');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('alerts');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.alerts)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);

      const alert = res.body.alerts[0];
      expect(alert).toHaveProperty('alert_id');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('state');
      expect(alert).toHaveProperty('trigger_rule');
      expect(alert).toHaveProperty('notification');
    });

    it('filters alerts by state (ACTIVE, PENDING_APPROVAL)', async () => {
      const res = await request(app).get('/api/v1/alerts?state=ACTIVE');

      expect(res.status).toBe(200);
      for (const alert of res.body.alerts) {
        expect(alert.state).toBe('ACTIVE');
      }
    });

    it('filters alerts by cell_id', async () => {
      const res = await request(app).get('/api/v1/alerts?cell_id=cell_sk_gangtok_01');

      expect(res.status).toBe(200);
      for (const alert of res.body.alerts) {
        expect(alert.cell_id).toBe('cell_sk_gangtok_01');
      }
    });
  });

  describe('POST /api/v1/alerts (Manual Creation)', () => {
    it('creates a manual candidate alert in PENDING_APPROVAL state', async () => {
      const payload = {
        cell_id: 'cell_sk_gangtok_01',
        severity: 'CRITICAL',
        trigger_reason: 'Field engineer observed 15cm tension crack opening on upper slope',
      };

      const res = await request(app)
        .post('/api/v1/alerts')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.state).toBe('PENDING_APPROVAL');
      expect(res.body.severity).toBe('CRITICAL');
      expect(res.body.trigger_rule).toBe('MANUAL');
      expect(res.body.trigger_reason).toBe(payload.trigger_reason);
      expect(res.body.approved_by).toBeNull();
      expect(res.body.notification.delivery_status).toBe('PENDING');
    });

    it('rejects invalid alert payload with missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/alerts')
        .send({
          severity: 'CRITICAL',
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Alert Lifecycle: Approval, Resolution, and Escalation', () => {
    let testAlertId: string;

    beforeEach(async () => {
      const alert = await alertService.createManualAlert({
        cell_id: 'cell_as_guwahati_01',
        severity: 'HIGH',
        trigger_reason: 'Continuous heavy rainfall triggered automatic candidate alert',
      });
      testAlertId = alert.alert_id;
    });

    it('GET /api/v1/alerts/:id retrieves alert details', async () => {
      const res = await request(app).get(`/api/v1/alerts/${testAlertId}`);

      expect(res.status).toBe(200);
      expect(res.body.alert_id).toBe(testAlertId);
      expect(res.body.state).toBe('PENDING_APPROVAL');
    });

    it('POST /api/v1/alerts/:id/acknowledge approves candidate alert to ACTIVE', async () => {
      const res = await request(app)
        .post(`/api/v1/alerts/${testAlertId}/acknowledge`)
        .send({
          approved_by: 'OFFICER_SDMA_ASSAM',
        });

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('ACTIVE');
      expect(res.body.approved_by).toBe('OFFICER_SDMA_ASSAM');
      expect(res.body.approved_at).not.toBeNull();
      expect(res.body.notification.channel).toBe('SIMULATED');
      expect(res.body.notification.delivery_status).toBe('SIMULATED');
      expect(res.body.notification.sent_at).not.toBeNull();
    });

    it('POST /api/v1/alerts/:id/acknowledge rejects re-approving an ACTIVE alert with 409 Conflict', async () => {
      // First approval
      await request(app).post(`/api/v1/alerts/${testAlertId}/acknowledge`).send();

      // Second approval attempt
      const res = await request(app).post(`/api/v1/alerts/${testAlertId}/acknowledge`).send();

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/v1/alerts/:id/resolve transitions ACTIVE alert to RESOLVED', async () => {
      // Approve first
      await request(app).post(`/api/v1/alerts/${testAlertId}/acknowledge`).send();

      // Resolve
      const res = await request(app)
        .post(`/api/v1/alerts/${testAlertId}/resolve`)
        .send({
          resolution_reason: 'Rainfall subsided, slope stabilized by NDRF inspection',
        });

      expect(res.status).toBe(200);
      expect(res.body.state).toBe('RESOLVED');
      expect(res.body.resolved_at).not.toBeNull();
    });

    it('POST /api/v1/alerts/:id/resolve rejects unapproved PENDING_APPROVAL alert with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/alerts/${testAlertId}/resolve`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('Automated Threshold Rule Evaluation & Deduplication', () => {
    it('evaluates Rule 1 (Critical Breach) when current risk >= 81', async () => {
      const cellId = 'test_cell_crit_eval_99';
      const alert = await alertService.evaluateZoneRules(cellId, 88, 70, 'North Sikkim Pass');

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('CRITICAL');
      expect(alert!.trigger_rule).toBe('RULE_1_CRITICAL');
      expect(alert!.state).toBe('PENDING_APPROVAL');
    });

    it('evaluates Rule 2 (Early Warning) when current risk < 81 and 24h forecast >= 81', async () => {
      const cellId = 'test_cell_early_warn_99';
      const alert = await alertService.evaluateZoneRules(cellId, 65, 86, 'Mizoram Highway NH-54');

      expect(alert).not.toBeNull();
      expect(alert!.severity).toBe('HIGH');
      expect(alert!.trigger_rule).toBe('RULE_2_EARLY_WARNING');
      expect(alert!.state).toBe('PENDING_APPROVAL');
    });

    it('deduplicates alerts for the same cell in the same risk band', async () => {
      const cellId = 'test_cell_dedup_99';

      // First evaluation triggers candidate alert
      const alert1 = await alertService.evaluateZoneRules(cellId, 85, null, 'Shillong Bypass');
      expect(alert1).not.toBeNull();

      // Second evaluation in same risk state returns existing alert without creating a duplicate
      const alert2 = await alertService.evaluateZoneRules(cellId, 86, null, 'Shillong Bypass');
      expect(alert2).not.toBeNull();
      expect(alert2!.alert_id).toBe(alert1!.alert_id);
    });
  });
});
