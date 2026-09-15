import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Risk API Endpoints (/api/v1/risk)', () => {
  describe('GET /api/v1/risk/:latitude/:longitude (Point Risk)', () => {
    it('returns 200 with canonical RiskPointResponse for valid coordinates', async () => {
      const res = await request(app).get('/api/v1/risk/27.33/88.61');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('latitude', 27.33);
      expect(res.body).toHaveProperty('longitude', 88.61);
      expect(typeof res.body.base_susceptibility).toBe('number');
      expect(typeof res.body.current_risk).toBe('number');
      expect(['VERY_LOW', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(res.body.risk_level);
      expect(['NORMAL', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL']).toContain(res.body.risk_state);
      expect(['INCREASING', 'DECREASING', 'STABLE']).toContain(res.body.trend);
      expect(['GOOD', 'DEGRADED', 'STALE', 'MISSING']).toContain(res.body.data_quality);
      expect(Array.isArray(res.body.forecasts)).toBe(true);

      // Verify forecast horizons and validation flags per contract CD-005
      const f24 = res.body.forecasts.find((f: any) => f.horizon === '24h');
      expect(f24).toBeDefined();
      expect(f24.validated).toBe(true);

      const f6 = res.body.forecasts.find((f: any) => f.horizon === '6h');
      expect(f6).toBeDefined();
      expect(f6.validated).toBe(false);
    });

    it('supports point query via query parameters (/api/v1/risk/point?lat=...&lon=...)', async () => {
      const res = await request(app).get('/api/v1/risk/point?lat=27.33&lon=88.61');

      expect(res.status).toBe(200);
      expect(res.body.latitude).toBe(27.33);
      expect(res.body.longitude).toBe(88.61);
      expect(res.body.current_risk).toBeGreaterThanOrEqual(0);
    });

    it('rejects invalid latitude out of range with 422', async () => {
      const res = await request(app).get('/api/v1/risk/120.5/88.61');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/risk/grid (Spatial Risk Heatmap)', () => {
    it('returns 200 GeoJSON FeatureCollection with metadata', async () => {
      const res = await request(app).get('/api/v1/risk/grid?bbox=88.5,27.2,88.7,27.4');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.crs?.properties?.name).toBe('urn:ogc:def:crs:OGC:1.3:CRS84');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.horizon).toBe('current');
      expect(typeof res.body.meta.total_cells).toBe('number');
      expect(Array.isArray(res.body.features)).toBe(true);

      if (res.body.features.length > 0) {
        const feature = res.body.features[0];
        expect(feature.type).toBe('Feature');
        expect(feature.geometry.type).toBe('Polygon');
        expect(feature.properties).toHaveProperty('cell_id');
        expect(feature.properties).toHaveProperty('risk_score');
        expect(feature.properties).toHaveProperty('risk_level');
        expect(feature.properties).toHaveProperty('risk_state');
        expect(feature.properties).toHaveProperty('response_priority');
      }
    });

    it('filters grid cells by horizon and min_risk', async () => {
      const res = await request(app).get(
        '/api/v1/risk/grid?bbox=88.5,27.2,88.7,27.4&horizon=24h&min_risk=50',
      );

      expect(res.status).toBe(200);
      expect(res.body.meta.horizon).toBe('24h');
      for (const feature of res.body.features) {
        expect(feature.properties.risk_score).toBeGreaterThanOrEqual(50);
      }
    });

    it('rejects invalid bbox with 422', async () => {
      const res = await request(app).get('/api/v1/risk/grid?bbox=invalid_bbox');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/risk/:cell_id (Zone Detail)', () => {
    it('returns 200 with full details, observation meta, and forecasts for valid cell', async () => {
      const res = await request(app).get('/api/v1/risk/CELL_NER_001');

      expect(res.status).toBe(200);
      expect(res.body.cell_id).toBe('CELL_NER_001');
      expect(res.body.geometry.type).toBe('Polygon');
      expect(res.body.observation_meta).toBeDefined();
      expect(res.body.observation_meta).toHaveProperty('rainfall_24h_mm');
      expect(res.body.observation_meta).toHaveProperty('rainfall_72h_mm');
      expect(Array.isArray(res.body.forecasts)).toBe(true);
    });

    it('returns 404 for non-existent cell ID', async () => {
      const res = await request(app).get('/api/v1/risk/NON_EXISTENT_CELL_99999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/risk/:cell_id/explain (SHAP Explanation)', () => {
    it('returns 200 with top factors for valid cell', async () => {
      const res = await request(app).get('/api/v1/risk/CELL_NER_001/explain');

      expect(res.status).toBe(200);
      expect(res.body.cell_id).toBe('CELL_NER_001');
      expect(res.body.explanation).toBeDefined();
      expect(Array.isArray(res.body.explanation.top_factors)).toBe(true);
      expect(res.body.explanation.top_factors.length).toBeGreaterThan(0);
      expect(res.body.explanation.top_factors[0]).toHaveProperty('feature');
      expect(res.body.explanation.top_factors[0]).toHaveProperty('shap_value');
    });
  });
});
