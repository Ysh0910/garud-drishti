import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';

const app = createApp();

describe('Phase 12: End-to-End Cross-Module Integration Tests', () => {
  describe('Journey 1: Early Warning & Risk Pipeline (SENSE -> ANALYSE -> PREDICT -> VISUALISE)', () => {
    it('executes point prediction -> bounding box grid -> zone detail -> SHAP explanation', async () => {
      // 1. Point prediction (Gangtok, Sikkim)
      const pointRes = await request(app).get('/api/v1/risk/27.3389/88.6065');
      expect(pointRes.status).toBe(200);
      expect(pointRes.body).toHaveProperty('current_risk');
      expect(pointRes.body).toHaveProperty('risk_level');
      expect(pointRes.body).toHaveProperty('base_susceptibility');
      expect(pointRes.body).toHaveProperty('model_version');
      expect(pointRes.body).toHaveProperty('data_quality');
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'VERY_LOW']).toContain(pointRes.body.risk_level);

      // 2. Bounding Box spatial grid query
      const gridRes = await request(app).get('/api/v1/risk/grid?bbox=88.0,27.0,89.0,28.0&format=geojson');
      expect(gridRes.status).toBe(200);
      expect(gridRes.body.type).toBe('FeatureCollection');
      expect(Array.isArray(gridRes.body.features)).toBe(true);
      expect(gridRes.body.features.length).toBeGreaterThan(0);

      const firstCell = gridRes.body.features[0];
      expect(firstCell.properties).toHaveProperty('cell_id');
      expect(firstCell.properties).toHaveProperty('risk_score');
      expect(firstCell.properties).toHaveProperty('risk_level');

      // 3. Zone forecast & observation detail query
      const zoneId = firstCell.properties.cell_id;
      const detailRes = await request(app).get(`/api/v1/risk/${zoneId}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body).toHaveProperty('cell_id', zoneId);
      expect(detailRes.body).toHaveProperty('base_susceptibility');
      expect(detailRes.body).toHaveProperty('observation_meta');
      expect(Array.isArray(detailRes.body.forecasts)).toBe(true);

      // 4. SHAP Feature Attribution Explainability
      const explainRes = await request(app).get(`/api/v1/risk/${zoneId}/explain`);
      expect(explainRes.status).toBe(200);
      expect(explainRes.body).toHaveProperty('cell_id', zoneId);
      expect(explainRes.body).toHaveProperty('explanation');
      expect(explainRes.body.explanation).toHaveProperty('top_factors');
      expect(Array.isArray(explainRes.body.explanation.top_factors)).toBe(true);
    });
  });

  describe('Journey 2: Citizen Ingestion & Authority Review (EVIDENCE -> VERIFY)', () => {
    it('submits report -> verifies idempotency -> queries GeoJSON map overlay -> verifies review state', async () => {
      const clientReportId = randomUUID();
      const payload = {
        client_report_id: clientReportId,
        latitude: 27.34,
        longitude: 88.62,
        category: 'LANDSLIDE',
        description: 'Large debris flow blocking national highway segment',
        severity: 'HIGH',
        captured_at: new Date().toISOString(),
      };

      // 1. Initial report ingestion
      const createRes = await request(app)
        .post('/api/v1/reports')
        .send(payload);

      expect(createRes.status).toBe(201);
      expect(createRes.body.client_report_id).toBe(clientReportId);
      expect(createRes.body.status).toBe('PENDING');
      const reportId = createRes.body.report_id;

      // 2. Idempotent re-submission with identical client_report_id returns existing record
      const retryRes = await request(app)
        .post('/api/v1/reports')
        .send(payload);

      expect([200, 201]).toContain(retryRes.status);
      expect(retryRes.body.report_id).toBe(reportId);

      // 3. Query GeoJSON overlay for map visualization
      const geojsonRes = await request(app).get('/api/v1/reports?format=geojson&status=PENDING');
      expect(geojsonRes.status).toBe(200);
      expect(geojsonRes.body.type).toBe('FeatureCollection');
      const feature = geojsonRes.body.features.find((f: any) => f.properties.report_id === reportId);
      expect(feature).toBeTruthy();
      expect(feature.geometry.type).toBe('Point');

      // 4. Authority review action (VERIFY)
      const verifyRes = await request(app)
        .post(`/api/v1/reports/${reportId}/verify`)
        .send({
          action: 'VERIFY',
          verified_by: 'OFFICER_INTEGRATION_TEST',
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.status).toBe('VERIFIED');
      expect(verifyRes.body.verified_by).toBeTruthy();
    });
  });

  describe('Journey 3: Exposure, Infrastructure & Response Prioritisation (EXPOSURE -> PRIORITISE)', () => {
    it('queries nearby assets -> evaluates multi-criteria priority -> returns transparent reasons', async () => {
      // 1. Proximity query for critical infrastructure within 10km of Gangtok
      const assetRes = await request(app).get('/api/v1/assets/nearby?latitude=27.33&longitude=88.61&radius_m=10000');
      expect(assetRes.status).toBe(200);
      expect(Array.isArray(assetRes.body.assets)).toBe(true);
      expect(assetRes.body.assets.length).toBeGreaterThan(0);

      // 2. Road vulnerability query with risk levels
      const roadRes = await request(app).get('/api/v1/roads/risk?min_risk=50');
      expect(roadRes.status).toBe(200);
      expect(roadRes.body.type).toBe('FeatureCollection');
      expect(roadRes.body.features.length).toBeGreaterThan(0);

      // 3. Village vulnerability query
      const villageRes = await request(app).get('/api/v1/villages/risk?min_risk=50');
      expect(villageRes.status).toBe(200);
      expect(Array.isArray(villageRes.body.villages)).toBe(true);

      // 4. Multi-criteria Response Prioritisation calculation
      const priorityRes = await request(app)
        .post('/api/v1/prioritization/evaluate')
        .send({
          hazard_score: 88,
          trend: 'INCREASING',
          population: 4500,
          has_hospital: true,
          has_national_highway: true,
          verified_reports_count: 3,
        });

      expect(priorityRes.status).toBe(200);
      expect(priorityRes.body.data.response_priority).toBe('IMMEDIATE');
      expect(priorityRes.body.data.priority_reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Journey 4: Alert Lifecycle & Authority Dashboard Aggregation (WARN -> RESPOND)', () => {
    it('creates alert -> acknowledges -> checks live dashboard summary KPIs -> resolves alert', async () => {
      // 1. Create candidate alert
      const createAlertRes = await request(app)
        .post('/api/v1/alerts')
        .send({
          cell_id: 'cell_sk_gangtok_01',
          severity: 'CRITICAL',
          trigger_reason: 'Integrated pipeline automated alert creation test',
        });

      expect(createAlertRes.status).toBe(201);
      expect(createAlertRes.body.state).toBe('PENDING_APPROVAL');
      const alertId = createAlertRes.body.alert_id;

      // 2. Approve alert (transition to ACTIVE with simulated notification)
      const ackRes = await request(app)
        .post(`/api/v1/alerts/${alertId}/acknowledge`)
        .send({
          approved_by: 'DISTRICT_COLLECTOR_EAST_SIKKIM',
        });

      expect(ackRes.status).toBe(200);
      expect(ackRes.body.state).toBe('ACTIVE');
      expect(ackRes.body.notification.channel).toBe('SIMULATED');

      // 3. Check Live Dashboard Summary (GET /api/v1/dashboard/summary)
      const dashboardRes = await request(app).get('/api/v1/dashboard/summary');
      expect(dashboardRes.status).toBe(200);
      expect(dashboardRes.body.kpi.active_alerts).toBeGreaterThanOrEqual(1);
      expect(dashboardRes.body.data_freshness.overall_quality).toBeDefined();

      // 4. Resolve alert
      const resolveRes = await request(app)
        .post(`/api/v1/alerts/${alertId}/resolve`)
        .send({
          resolution_reason: 'Slope remediation measures completed successfully',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.state).toBe('RESOLVED');
      expect(resolveRes.body.resolved_at).not.toBeNull();
    });
  });

  describe('Journey 5: Health & System Diagnostics', () => {
    it('verifies /health, /health/live, and /health/ready endpoints', async () => {
      const healthRes = await request(app).get('/health');
      expect([200, 503]).toContain(healthRes.status);
      expect(healthRes.body).toHaveProperty('status');

      const liveRes = await request(app).get('/health/live');
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.status).toBe('ok');

      const readyRes = await request(app).get('/health/ready');
      expect([200, 503]).toContain(readyRes.status);
    });
  });
});
