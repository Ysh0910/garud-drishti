/**
 * Risk Information Contracts
 * Strictly synchronized with contracts/risk.md
 */

import { RiskLevel, RiskState, Trend, DataQuality } from './enums';

export interface ForecastEntry {
  horizon: '6h' | '24h' | '48h' | '72h';
  risk_score: number;
  risk_level: RiskLevel;
  validated: boolean;
}

export interface RiskPointResponse {
  latitude: number;
  longitude: number;
  cell_id: string | null;
  base_susceptibility: number;
  current_risk: number;
  risk_level: RiskLevel;
  risk_state: RiskState;
  trend: Trend;
  confidence: number | null;
  data_quality: DataQuality;
  forecasts: ForecastEntry[];
  updated_at: string;
  model_version: string;
}
