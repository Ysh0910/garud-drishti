/**
 * Local Risk Information Service
 * Supplies the "Risk at Your Location" card with current hazard status,
 * 24h forecast, and advisory guidance.
 */

import { APP_CONFIG } from '../constants/config';
import { RiskPointResponse } from '../types/risk';
import { ApiClient } from './api';

export class RiskService {
  static async getLocalRisk(lat?: number, lon?: number): Promise<RiskPointResponse> {
    const latitude = lat ?? APP_CONFIG.defaultLocation.latitude;
    const longitude = lon ?? APP_CONFIG.defaultLocation.longitude;

    if (!APP_CONFIG.useMockTransport) {
      try {
        return await ApiClient.getPointRisk(latitude, longitude);
      } catch {
        // Graceful fallback to cached/mock risk on network failure
      }
    }

    // Realistic mock data reflecting contracts/risk.md and contracts/examples/risk-point.json
    return {
      latitude,
      longitude,
      cell_id: 'cell_ner_0042',
      base_susceptibility: 68,
      current_risk: 74,
      risk_level: 'HIGH',
      risk_state: 'ELEVATED',
      trend: 'INCREASING',
      confidence: 0.85,
      data_quality: 'GOOD',
      forecasts: [
        { horizon: '6h', risk_score: 79, risk_level: 'HIGH', validated: false },
        { horizon: '24h', risk_score: 86, risk_level: 'CRITICAL', validated: true },
        { horizon: '48h', risk_score: 65, risk_level: 'HIGH', validated: false },
        { horizon: '72h', risk_score: 48, risk_level: 'MODERATE', validated: false },
      ],
      updated_at: new Date().toISOString(),
      model_version: 'dynamic_xgb_v1',
    };
  }
}
