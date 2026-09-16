import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import { reportService } from '../src/services/reportService';
import { alertService } from '../src/services/alertService';

const app = createApp();

describe('Phase 11: Dashboard Aggregation (GET /api/v1/dashboard/summary)', () => {
  it('returns unified system KPIs with data freshness according to contracts/dashboard.md', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpi');
    expect(res.body).toHaveProperty('data_freshness');
    expect(res.body).toHaveProperty('generated_at');

    const { kpi, data_freshness } = res.body;

    // Verify all 7 core KPIs are non-null integers >= 0
    expect(typeof kpi.critical_zones).toBe('number');
    expect(kpi.critical_zones).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.high_risk_zones).toBe('number');
    expect(kpi.high_risk_zones).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.active_alerts).toBe('number');
    expect(kpi.active_alerts).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.new_reports).toBe('number');
    expect(kpi.new_reports).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.roads_at_risk).toBe('number');
    expect(kpi.roads_at_risk).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.villages_at_risk).toBe('number');
    expect(kpi.villages_at_risk).toBeGreaterThanOrEqual(0);

    expect(typeof kpi.unresolved_incidents).toBe('number');
    expect(kpi.unresolved_incidents).toBeGreaterThanOrEqual(0);

    // Verify data freshness indicators
    expect(['GOOD', 'DEGRADED', 'STALE', 'MISSING']).toContain(data_freshness.overall_quality);
    if (data_freshness.risk_grid_updated_at) {
      expect(new Date(data_freshness.risk_grid_updated_at).toString()).not.toBe('Invalid Date');
    }
    if (data_freshness.rainfall_updated_at) {
      expect(new Date(data_freshness.rainfall_updated_at).toString()).not.toBe('Invalid Date');
    }

    // Verify generated_at timestamp
    expect(new Date(res.body.generated_at).toString()).not.toBe('Invalid Date');
  });

  it('reflects report ingestion in unresolved incidents and new reports KPI count', async () => {
    const initialRes = await request(app).get('/api/v1/dashboard/summary');
    const initialNewReports = initialRes.body.kpi.new_reports;
    const initialUnresolved = initialRes.body.kpi.unresolved_incidents;

    // Ingest a new pending citizen report
    await reportService.createReport({
      client_report_id: 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d',
      latitude: 27.33,
      longitude: 88.61,
      captured_at: new Date().toISOString(),
      category: 'ROCKFALL',
      description: 'Dashboard KPI test rockfall event',
      severity: 'HIGH',
    });


    const updatedRes = await request(app).get('/api/v1/dashboard/summary');
    expect(updatedRes.body.kpi.new_reports).toBeGreaterThanOrEqual(initialNewReports + 1);
    expect(updatedRes.body.kpi.unresolved_incidents).toBeGreaterThanOrEqual(initialUnresolved + 1);
  });

  it('reflects active alert count accurately when candidate alerts are approved', async () => {
    const initialRes = await request(app).get('/api/v1/dashboard/summary');
    const initialActive = initialRes.body.kpi.active_alerts;

    // Create and approve candidate alert
    const candidate = await alertService.createManualAlert({
      cell_id: 'cell_sk_gangtok_01',
      severity: 'CRITICAL',
      trigger_reason: 'Dashboard active alert KPI increment test',
    });

    await alertService.acknowledgeAlert(candidate.alert_id, 'SDMA_TEST_OFFICER');

    const updatedRes = await request(app).get('/api/v1/dashboard/summary');
    expect(updatedRes.body.kpi.active_alerts).toBeGreaterThanOrEqual(initialActive + 1);
  });
});
