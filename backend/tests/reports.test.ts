import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';
import crypto from 'crypto';

const app = createApp();

describe('Phase 7: Citizen Reports API (/api/v1/reports)', () => {
  const testClientReportId = crypto.randomUUID();
  let createdReportId: string;

  describe('POST /api/v1/reports (Report Ingestion)', () => {
    it('creates a new hazard report with 201 Created from JSON payload', async () => {
      const payload = {
        client_report_id: testClientReportId,
        category: 'ROCKFALL',
        description: 'Large boulder fell across NH-10 near 29th Mile.',
        latitude: 27.33,
        longitude: 88.61,
        location_accuracy_m: 5.5,
        captured_at: new Date().toISOString(),
        severity: 'HIGH',
      };

      const res = await request(app).post('/api/v1/reports').send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('report_id');
      expect(res.body.client_report_id).toBe(testClientReportId);
      expect(res.body.category).toBe('ROCKFALL');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.latitude).toBe(27.33);
      expect(res.body.longitude).toBe(88.61);
      expect(res.body.severity).toBe('HIGH');
      expect(res.body.evidence_score).toBeNull();

      createdReportId = res.body.report_id;
    });

    it('handles idempotent submissions with the same client_report_id', async () => {
      const duplicatePayload = {
        client_report_id: testClientReportId,
        category: 'ROCKFALL',
        description: 'Duplicate submission from retry queue',
        latitude: 27.33,
        longitude: 88.61,
        captured_at: new Date().toISOString(),
      };

      const res = await request(app).post('/api/v1/reports').send(duplicatePayload);

      expect(res.status).toBe(201);
      expect(res.body.report_id).toBe(createdReportId);
      expect(res.body.client_report_id).toBe(testClientReportId);
    });

    it('supports multipart/form-data upload with photo attachment', async () => {
      const multipartClientId = crypto.randomUUID();
      const fakeImageBuffer = Buffer.from('fake image content');

      const res = await request(app)
        .post('/api/v1/reports')
        .field('client_report_id', multipartClientId)
        .field('category', 'SOIL_MOVEMENT')
        .field('description', 'Fresh tension cracks visible on slope.')
        .field('latitude', '27.34')
        .field('longitude', '88.62')
        .field('captured_at', new Date().toISOString())
        .field('severity', 'MEDIUM')
        .attach('photo', fakeImageBuffer, { filename: 'crack.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.client_report_id).toBe(multipartClientId);
      expect(res.body.category).toBe('SOIL_MOVEMENT');
      expect(res.body.media_url).toMatch(/\/uploads\/report_.*\.jpg/);
    });

    it('rejects invalid category with 422 VALIDATION_ERROR', async () => {
      const invalidPayload = {
        client_report_id: crypto.randomUUID(),
        category: 'INVALID_CATEGORY_NAME',
        latitude: 27.33,
        longitude: 88.61,
        captured_at: new Date().toISOString(),
      };

      const res = await request(app).post('/api/v1/reports').send(invalidPayload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-UUID client_report_id with 422 VALIDATION_ERROR', async () => {
      const invalidPayload = {
        client_report_id: 'not-a-uuid',
        category: 'CRACK',
        latitude: 27.33,
        longitude: 88.61,
        captured_at: new Date().toISOString(),
      };

      const res = await request(app).post('/api/v1/reports').send(invalidPayload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/reports (List Reports & GeoJSON)', () => {
    it('returns paginated list of reports', async () => {
      const res = await request(app).get('/api/v1/reports?limit=10&offset=0');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reports');
      expect(Array.isArray(res.body.reports)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(0);
    });

    it('filters reports by category', async () => {
      const res = await request(app).get('/api/v1/reports?category=ROCKFALL');

      expect(res.status).toBe(200);
      for (const report of res.body.reports) {
        expect(report.category).toBe('ROCKFALL');
      }
    });

    it('supports format=geojson for authority map visualization', async () => {
      const res = await request(app).get('/api/v1/reports?format=geojson');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);

      if (res.body.features.length > 0) {
        const feature = res.body.features[0];
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Point');
        expect(feature.properties).toHaveProperty('report_id');
        expect(feature.properties).toHaveProperty('category');
        expect(feature.properties).toHaveProperty('status');
      }
    });
  });

  describe('GET /api/v1/reports/:report_id (Report Detail)', () => {
    it('returns 200 with full report details for valid UUID', async () => {
      const res = await request(app).get(`/api/v1/reports/${createdReportId}`);

      expect(res.status).toBe(200);
      expect(res.body.report_id).toBe(createdReportId);
      expect(res.body.category).toBe('ROCKFALL');
      expect(res.body.latitude).toBe(27.33);
      expect(res.body.longitude).toBe(88.61);
    });

    it('returns 404 for non-existent report UUID', async () => {
      const nonExistent = crypto.randomUUID();
      const res = await request(app).get(`/api/v1/reports/${nonExistent}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 422 for malformed non-UUID report_id param', async () => {
      const res = await request(app).get('/api/v1/reports/malformed-id-123');

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/reports/:report_id/verify (Authority Verification)', () => {
    it('verifies a report with action=VERIFY', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdReportId}/verify`)
        .send({ action: 'VERIFY' });

      expect(res.status).toBe(200);
      expect(res.body.report_id).toBe(createdReportId);
      expect(res.body.status).toBe('VERIFIED');
      expect(res.body.verified_by).toBeDefined();
      expect(res.body.verified_at).toBeDefined();
    });

    it('marks a report probable with action=MARK_PROBABLE', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdReportId}/verify`)
        .send({ action: 'MARK_PROBABLE' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROBABLE');
    });

    it('rejects a report with action=REJECT and valid rejection_reason', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdReportId}/verify`)
        .send({
          action: 'REJECT',
          rejection_reason: 'Duplicate report of resolved road maintenance event.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
      expect(res.body.rejection_reason).toBe(
        'Duplicate report of resolved road maintenance event.',
      );
    });

    it('rejects action=REJECT with 422 when rejection_reason is missing', async () => {
      const res = await request(app)
        .post(`/api/v1/reports/${createdReportId}/verify`)
        .send({ action: 'REJECT' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when verifying non-existent report', async () => {
      const nonExistent = crypto.randomUUID();
      const res = await request(app)
        .post(`/api/v1/reports/${nonExistent}/verify`)
        .send({ action: 'VERIFY' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
