import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Phase 8: Exposure & Critical Infrastructure APIs', () => {
  describe('GET /api/v1/assets/nearby', () => {
    it('returns nearby infrastructure and settlement assets with distances', async () => {
      const res = await request(app).get('/api/v1/assets/nearby?latitude=27.33&longitude=88.61&radius_m=10000');

      expect(res.status).toBe(200);
      expect(res.body.query_latitude).toBe(27.33);
      expect(res.body.query_longitude).toBe(88.61);
      expect(res.body.radius_m).toBe(10000);
      expect(Array.isArray(res.body.assets)).toBe(true);
      expect(res.body.assets.length).toBeGreaterThan(0);

      const firstAsset = res.body.assets[0];
      expect(firstAsset).toHaveProperty('asset_id');
      expect(firstAsset).toHaveProperty('asset_type');
      expect(firstAsset).toHaveProperty('distance_m');
      expect(firstAsset).toHaveProperty('geometry');
      expect(typeof firstAsset.distance_m).toBe('number');
      expect(firstAsset.distance_m).toBeLessThanOrEqual(10000);

      // Verify ascending distance sort
      for (let i = 1; i < res.body.assets.length; i++) {
        expect(res.body.assets[i].distance_m).toBeGreaterThanOrEqual(res.body.assets[i - 1].distance_m);
      }
    });

    it('filters nearby assets by asset_type', async () => {
      const res = await request(app).get(
        '/api/v1/assets/nearby?latitude=27.33&longitude=88.61&radius_m=15000&asset_type=HOSPITAL',
      );

      expect(res.status).toBe(200);
      for (const asset of res.body.assets) {
        expect(asset.asset_type).toBe('HOSPITAL');
      }
    });

    it('rejects missing latitude or longitude with 422 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/assets/nearby?latitude=27.33');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects radius_m exceeding 50km with 422 VALIDATION_ERROR', async () => {
      const res = await request(app).get(
        '/api/v1/assets/nearby?latitude=27.33&longitude=88.61&radius_m=100000',
      );
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/roads/risk', () => {
    it('returns road segments with risk context as GeoJSON FeatureCollection', async () => {
      const res = await request(app).get('/api/v1/roads/risk');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.crs?.properties?.name).toBe('urn:ogc:def:crs:OGC:1.3:CRS84');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);

      const road = res.body.features[0];
      expect(road.type).toBe('Feature');
      expect(road.geometry.type).toBe('LineString');
      expect(road.properties).toHaveProperty('road_id');
      expect(road.properties).toHaveProperty('road_class');
      expect(road.properties).toHaveProperty('risk_score');
      expect(road.properties).toHaveProperty('risk_level');
      expect(road.properties).toHaveProperty('risk_trend');
      expect(road.properties).toHaveProperty('nearby_reports');
      expect(typeof road.properties.nearby_reports).toBe('number');
    });

    it('filters roads by min_risk threshold', async () => {
      const res = await request(app).get('/api/v1/roads/risk?min_risk=60');

      expect(res.status).toBe(200);
      for (const feature of res.body.features) {
        expect(feature.properties.risk_score).toBeGreaterThanOrEqual(60);
      }
    });

    it('filters roads by bounding box', async () => {
      const res = await request(app).get('/api/v1/roads/risk?bbox=88.5,27.2,88.7,27.4');

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
    });

    it('rejects malformed bbox with 422 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/roads/risk?bbox=invalid_bbox');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/villages/risk', () => {
    it('returns villages with population and risk context', async () => {
      const res = await request(app).get('/api/v1/villages/risk');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('villages');
      expect(Array.isArray(res.body.villages)).toBe(true);
      expect(res.body.villages.length).toBeGreaterThan(0);

      const village = res.body.villages[0];
      expect(village).toHaveProperty('village_id');
      expect(village).toHaveProperty('name');
      expect(village).toHaveProperty('latitude');
      expect(village).toHaveProperty('longitude');
      expect(village).toHaveProperty('current_risk');
      expect(village).toHaveProperty('risk_level');
      expect(village).toHaveProperty('road_access_risk');
      expect(village).toHaveProperty('updated_at');
    });

    it('filters villages by min_risk threshold', async () => {
      const res = await request(app).get('/api/v1/villages/risk?min_risk=40');

      expect(res.status).toBe(200);
      for (const village of res.body.villages) {
        expect(village.current_risk).toBeGreaterThanOrEqual(40);
      }
    });

    it('filters villages by bounding box', async () => {
      const res = await request(app).get('/api/v1/villages/risk?bbox=88.5,27.2,88.7,27.6');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.villages)).toBe(true);
    });

    it('rejects invalid bbox with 422 VALIDATION_ERROR', async () => {
      const res = await request(app).get('/api/v1/villages/risk?bbox=not,a,valid,box');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
