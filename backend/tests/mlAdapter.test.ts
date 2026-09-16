import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  MockMLAdapter,
  HttpMLAdapter,
  CompositeMLAdapter,
  MLPredictionResult,
} from '../src/adapters/mlAdapter';

describe('Phase 6: ML Adapter Layer', () => {
  describe('MockMLAdapter', () => {
    const mockAdapter = new MockMLAdapter();

    it('returns contract-compliant MLPredictionResult for valid NER point', async () => {
      const result = await mockAdapter.getPointPrediction(27.33, 88.61);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('mock_fallback');
      expect(result?.model_id).toBe('dynamic_risk_xgboost_v1');
      expect(result?.model_version).toContain('dynamic_risk_xgboost_v1');
      expect(typeof result?.base_susceptibility).toBe('number');
      expect(typeof result?.current_risk).toBe('number');
      expect(typeof result?.risk_24h).toBe('number');
      expect(result?.horizons_supported?.['24h'].validated).toBe(true);
      expect(result?.horizons_supported?.['6h'].validated).toBe(false);
      expect(result?.environmental_observations).toBeDefined();
    });

    it('returns null for coordinates far outside NER bounds', async () => {
      const result = await mockAdapter.getPointPrediction(12.97, 77.59); // Bangalore
      expect(result).toBeNull();
    });

    it('filters spatial grid predictions by bounding box', async () => {
      const grid = await mockAdapter.getGridPredictions({
        west: 88.5,
        south: 27.2,
        east: 88.7,
        north: 27.4,
      });

      expect(Array.isArray(grid)).toBe(true);
      expect(grid.length).toBeGreaterThan(0);
      expect(grid[0]).toHaveProperty('cell_id');
      expect(grid[0]).toHaveProperty('current_risk');
    });

    it('returns zone prediction by cell_id', async () => {
      const zone = await mockAdapter.getZonePrediction('CELL_NER_001');
      expect(zone).not.toBeNull();
      expect(zone?.cell_id).toBe('CELL_NER_001');
    });
  });

  describe('HttpMLAdapter', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('maps successful live FastAPI payload to MLPredictionResult', async () => {
      const fakeLivePayload = {
        prediction_id: 'PRD_LIVE_1726400000',
        location: { latitude: 25.57, longitude: 91.88 },
        base_susceptibility: {
          score: 55,
          level: 'MODERATE',
          raw_probability: 0.554,
        },
        dynamic_risk: {
          current_risk: 72,
          current_risk_level: 'HIGH',
          risk_24h: 81,
          risk_24h_level: 'CRITICAL',
          horizons: {
            current: { validated: true, score: 72 },
            '24h': { validated: true, score: 81 },
            '6h': { validated: false, score: null },
            '48h': { validated: false, score: null },
            '72h': { validated: false, score: null },
          },
        },
        environmental_observations: {
          rainfall_24h_mm: 110.5,
          soil_moisture: 0.38,
          forecast_rain_24h_mm: 65.0,
          source: 'IMD',
          data_quality: 'GOOD',
          stale: false,
        },
        metadata: {
          model_version_susceptibility: 'susceptibility_xgboost_v1:v1.0',
          model_version_dynamic_risk: 'dynamic_risk_xgboost_v1:v1.0',
          status: 'VALIDATED',
        },
      };

      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fakeLivePayload,
      } as Response);

      const httpAdapter = new HttpMLAdapter('http://localhost:8001');
      const result = await httpAdapter.getPointPrediction(25.57, 91.88);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('live_ml');
      expect(result?.prediction_id).toBe('PRD_LIVE_1726400000');
      expect(result?.base_susceptibility).toBe(55);
      expect(result?.current_risk).toBe(72);
      expect(result?.risk_24h).toBe(81);
      expect(result?.model_version).toBe(
        'susceptibility_xgboost_v1:v1.0+dynamic_risk_xgboost_v1:v1.0',
      );
      expect(result?.data_quality).toBe('GOOD');
    });

    it('handles HTTP error responses gracefully without throwing (returns null)', async () => {
      global.fetch = jest.fn<typeof global.fetch>().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service Unavailable' }),
      } as Response);

      const httpAdapter = new HttpMLAdapter('http://localhost:8001');
      const result = await httpAdapter.getPointPrediction(25.57, 91.88);

      expect(result).toBeNull();
    });

    it('handles network timeouts and connection refused gracefully (returns null)', async () => {
      global.fetch = jest
        .fn<typeof global.fetch>()
        .mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8001'));

      const httpAdapter = new HttpMLAdapter('http://localhost:8001');
      const result = await httpAdapter.getPointPrediction(25.57, 91.88);

      expect(result).toBeNull();
    });
  });

  describe('CompositeMLAdapter (Graceful Fallback & Degradation)', () => {
    it('uses primary live adapter when healthy', async () => {
      const mockLiveResult: MLPredictionResult = {
        source: 'live_ml',
        model_version: 'dynamic_risk_xgboost_v1:v1.0',
        latitude: 27.33,
        longitude: 88.61,
        base_susceptibility: 60,
        current_risk: 75,
        risk_24h: 80,
        data_quality: 'GOOD',
        confidence: 0.91,
      };

      const mockLiveAdapter = {
        getPointPrediction: jest.fn<any>().mockResolvedValue(mockLiveResult),
        getGridPredictions: jest.fn<any>().mockResolvedValue([]),
        getZonePrediction: jest.fn<any>().mockResolvedValue(null),
        isLiveAvailable: jest.fn<any>().mockResolvedValue(true),
      };

      const mockFallbackAdapter = new MockMLAdapter();
      const composite = new CompositeMLAdapter(mockFallbackAdapter, mockLiveAdapter);

      const result = await composite.getPointPrediction(27.33, 88.61);
      expect(result?.source).toBe('live_ml');
      expect(result?.current_risk).toBe(75);
      expect(result?.data_quality).toBe('GOOD');
    });

    it('falls back to mock adapter and marks data_quality as DEGRADED when primary live adapter fails', async () => {
      const failingLiveAdapter = {
        getPointPrediction: jest.fn<any>().mockRejectedValue(new Error('ML service timeout')),
        getGridPredictions: jest.fn<any>().mockResolvedValue([]),
        getZonePrediction: jest.fn<any>().mockResolvedValue(null),
        isLiveAvailable: jest.fn<any>().mockResolvedValue(false),
      };

      const mockFallbackAdapter = new MockMLAdapter();
      const composite = new CompositeMLAdapter(mockFallbackAdapter, failingLiveAdapter);

      const result = await composite.getPointPrediction(27.33, 88.61);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('mock_fallback');
      // When primary was configured but failed, data quality must reflect degradation
      expect(result?.data_quality).toBe('DEGRADED');
      expect(result?.current_risk).toBeGreaterThan(0);
    });

    it('serves standard mock results with GOOD data quality when no primary adapter is configured', async () => {
      const mockFallbackAdapter = new MockMLAdapter();
      const composite = new CompositeMLAdapter(mockFallbackAdapter, null);

      const result = await composite.getPointPrediction(27.33, 88.61);

      expect(result).not.toBeNull();
      expect(result?.source).toBe('mock_fallback');
      expect(result?.data_quality).toBe('GOOD');
    });
  });
});
