import request from 'supertest';
import { createApp } from '../src/app';
import {
  calculateResponsePriority,
  scoreToResponsePriority,
  DEFAULT_PRIORITIZATION_WEIGHTS,
} from '../src/services/prioritizationService';

const app = createApp();

describe('Phase 9: Response Prioritisation Engine', () => {
  describe('Mathematical Model & Classification', () => {
    it('maps score thresholds to canonical ResponsePriority enum correctly', () => {
      expect(scoreToResponsePriority(95)).toBe('IMMEDIATE');
      expect(scoreToResponsePriority(80)).toBe('IMMEDIATE');
      expect(scoreToResponsePriority(79)).toBe('HIGH');
      expect(scoreToResponsePriority(60)).toBe('HIGH');
      expect(scoreToResponsePriority(59)).toBe('MEDIUM');
      expect(scoreToResponsePriority(35)).toBe('MEDIUM');
      expect(scoreToResponsePriority(34)).toBe('LOW');
      expect(scoreToResponsePriority(0)).toBe('LOW');
    });


    it('demonstrates Hazard vs Impact separation (AGENTS.md §18)', () => {
      // Zone A: High hazard (90) but zero population and no critical infrastructure
      const isolatedZone = calculateResponsePriority({
        hazard_score: 90,
        population: 0,
        nearby_villages_count: 0,
        has_hospital: false,
        has_national_highway: false,
      });

      // Zone B: Moderate hazard (75) but with hospital, national highway, and 5000 residents
      const populatedZone = calculateResponsePriority({
        hazard_score: 75,
        population: 5000,
        has_hospital: true,
        has_national_highway: true,
        verified_reports_count: 2,
      });

      // Populated critical corridor gets higher operational priority than isolated slope
      expect(populatedZone.priority_score).toBeGreaterThan(isolatedZone.priority_score);
      expect(populatedZone.response_priority).toBe('IMMEDIATE');
    });

    it('adjusts hazard subscore dynamically based on risk trend momentum', () => {
      const stable = calculateResponsePriority({
        hazard_score: 60,
        trend: 'STABLE',
      });

      const increasing = calculateResponsePriority({
        hazard_score: 60,
        trend: 'INCREASING',
      });

      const decreasing = calculateResponsePriority({
        hazard_score: 60,
        trend: 'DECREASING',
      });

      expect(increasing.breakdown.hazard_subscore).toBeGreaterThan(stable.breakdown.hazard_subscore);
      expect(decreasing.breakdown.hazard_subscore).toBeLessThan(stable.breakdown.hazard_subscore);
      expect(increasing.priority_reasons).toContain('Rapidly increasing dynamic risk trend');
    });

    it('generates transparent, human-readable auditable priority reasons', () => {
      const result = calculateResponsePriority({
        hazard_score: 88,
        population: 4500,
        has_hospital: true,
        has_national_highway: true,
        verified_reports_count: 3,
      });

      expect(result.response_priority).toBe('IMMEDIATE');
      expect(result.priority_reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('CRITICAL hazard risk level (88/100)'),
          expect.stringContaining('High population density exposed (4,500 residents)'),
          expect.stringContaining('Critical healthcare/hospital facility within impact perimeter'),
          expect.stringContaining('National Highway lifeline route vulnerable to disruption'),
          expect.stringContaining('3 verified field report(s) corroborating ground displacement'),
        ])
      );
    });

    it('supports custom authority weight calibration', () => {
      // Prioritize infrastructure heavily
      const customWeights = {
        hazard_weight: 0.20,
        exposure_weight: 0.10,
        infrastructure_weight: 0.60,
        connectivity_weight: 0.10,
      };

      const result = calculateResponsePriority(
        {
          hazard_score: 40,
          has_hospital: true,
          has_power_or_comm: true,
          has_school_or_shelter: true,
        },
        customWeights
      );

      expect(result.breakdown.weights_applied.infrastructure_weight).toBe(0.60);
      expect(result.priority_score).toBeGreaterThanOrEqual(60);
    });
  });

  describe('API Endpoints: /api/v1/prioritization', () => {
    it('GET /api/v1/prioritization/config returns default weights and operational bands', async () => {
      const res = await request(app).get('/api/v1/prioritization/config');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('default_weights');
      expect(res.body.default_weights).toEqual(DEFAULT_PRIORITIZATION_WEIGHTS);
      expect(res.body).toHaveProperty('bands');
      expect(res.body.bands).toHaveProperty('IMMEDIATE');
      expect(res.body.bands).toHaveProperty('HIGH');
    });

    it('POST /api/v1/prioritization/evaluate evaluates priority successfully', async () => {
      const payload = {
        hazard_score: 85,
        trend: 'INCREASING',
        population: 3200,
        has_hospital: true,
        has_national_highway: true,
        verified_reports_count: 2,
      };

      const res = await request(app)
        .post('/api/v1/prioritization/evaluate')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('priority_score');
      expect(res.body.data).toHaveProperty('response_priority');
      expect(res.body.data).toHaveProperty('priority_reasons');
      expect(res.body.data.priority_reasons.length).toBeGreaterThan(0);
      expect(res.body.data.response_priority).toBe('IMMEDIATE');
    });

    it('POST /api/v1/prioritization/evaluate validates missing required hazard_score', async () => {
      const res = await request(app)
        .post('/api/v1/prioritization/evaluate')
        .send({
          population: 1000,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/prioritization/evaluate rejects custom weights that do not sum to 1.0', async () => {
      const res = await request(app)
        .post('/api/v1/prioritization/evaluate')
        .send({
          hazard_score: 75,
          weights: {
            hazard_weight: 0.8,
            exposure_weight: 0.8,
            infrastructure_weight: 0.2,
            connectivity_weight: 0.2,
          },
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
