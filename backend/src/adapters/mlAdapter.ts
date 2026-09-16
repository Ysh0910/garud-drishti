import { MOCK_RISK_CELLS, MockRiskCell } from './mockRiskData';
import { BoundingBox } from '../repositories/geo';
import { config } from '../config';
import { DataQuality } from '../types';

// ============================================================================
// Canonical ML Prediction & Feature Interfaces
// Conforms strictly to contracts/ml.md and contracts/risk.md
// ============================================================================

export interface MLPredictionResult {
  source: 'live_ml' | 'mock_fallback';
  model_id?: string;
  model_version: string;
  model_version_susceptibility?: string;
  model_version_dynamic_risk?: string;
  prediction_id?: string;
  latitude: number;
  longitude: number;
  cell_id?: string | null;
  base_susceptibility: number;
  current_risk: number;
  risk_24h: number | null;
  forecast_6h?: number | null;
  forecast_24h?: number | null;
  forecast_48h?: number | null;
  forecast_72h?: number | null;
  horizons_supported?: {
    current: { validated: boolean; score: number | null };
    '24h': { validated: boolean; score: number | null };
    '6h': { validated: boolean; score: number | null };
    '48h': { validated: boolean; score: number | null };
    '72h': { validated: boolean; score: number | null };
  };
  environmental_observations?: {
    rainfall_24h_mm?: number | null;
    rainfall_72h_mm?: number | null;
    soil_moisture?: number | null;
    forecast_rain_24h_mm?: number | null;
    source?: string | null;
    observed_at?: string | null;
    data_quality?: DataQuality;
    stale?: boolean;
  };
  explanation?: {
    top_factors: Array<{
      feature: string;
      direction: 'POSITIVE' | 'NEGATIVE';
      shap_value: number;
    }>;
    explanation_version: string;
  };
  data_quality: DataQuality;
  confidence: number | null;
}

// ============================================================================
// ML Adapter Interface Boundary
// Isolates model inference / precomputed outputs from the HTTP API.
// ============================================================================

export interface IMLAdapter {
  getPointPrediction(lat: number, lon: number): Promise<MLPredictionResult | null>;
  getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]>;
  getZonePrediction(cellId: string): Promise<MockRiskCell | null>;
  isLiveAvailable(): Promise<boolean>;
}

// ============================================================================
// Mock ML Adapter (Deterministic / Precomputed Fallback)
// ============================================================================

export class MockMLAdapter implements IMLAdapter {
  async getPointPrediction(lat: number, lon: number): Promise<MLPredictionResult | null> {
    // Find containing or closest mock cell
    for (const cell of MOCK_RISK_CELLS) {
      const ring = cell.geometry.coordinates[0];
      const minLon = Math.min(...ring.map((c) => c[0]));
      const maxLon = Math.max(...ring.map((c) => c[0]));
      const minLat = Math.min(...ring.map((c) => c[1]));
      const maxLat = Math.max(...ring.map((c) => c[1]));

      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
        return this.mapMockCellToResult(cell, lat, lon);
      }
    }

    // Default fallback to first mock cell if within NER broad bounds
    if (lat >= 21.5 && lat <= 29.5 && lon >= 89.5 && lon <= 97.5) {
      return this.mapMockCellToResult(MOCK_RISK_CELLS[0], lat, lon);
    }

    return null;
  }

  async getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]> {
    return MOCK_RISK_CELLS.filter((cell) => {
      if (minRisk !== undefined && cell.current_risk < minRisk) {
        return false;
      }

      const ring = cell.geometry.coordinates[0];
      const minLon = Math.min(...ring.map((c) => c[0]));
      const maxLon = Math.max(...ring.map((c) => c[0]));
      const minLat = Math.min(...ring.map((c) => c[1]));
      const maxLat = Math.max(...ring.map((c) => c[1]));

      const noOverlap =
        maxLon < bbox.west ||
        minLon > bbox.east ||
        maxLat < bbox.south ||
        minLat > bbox.north;

      return !noOverlap;
    });
  }

  async getZonePrediction(cellId: string): Promise<MockRiskCell | null> {
    const found = MOCK_RISK_CELLS.find((c) => c.cell_id === cellId);
    return found || null;
  }

  async isLiveAvailable(): Promise<boolean> {
    return true; // Mock is always available
  }

  private mapMockCellToResult(cell: MockRiskCell, lat: number, lon: number): MLPredictionResult {
    return {
      source: 'mock_fallback',
      model_id: 'dynamic_risk_xgboost_v1',
      model_version: cell.model_version || 'dynamic_risk_xgboost_v1:v1.0',
      model_version_susceptibility: 'susceptibility_xgboost_v1:v1.0',
      model_version_dynamic_risk: 'dynamic_risk_xgboost_v1:v1.0',
      prediction_id: `PRD_MOCK_${cell.cell_id}`,
      latitude: lat,
      longitude: lon,
      cell_id: cell.cell_id,
      base_susceptibility: cell.base_susceptibility,
      current_risk: cell.current_risk,
      risk_24h: cell.forecast_24h,
      forecast_6h: cell.forecast_6h,
      forecast_24h: cell.forecast_24h,
      forecast_48h: cell.forecast_48h,
      forecast_72h: cell.forecast_72h,
      horizons_supported: {
        current: { validated: true, score: cell.current_risk },
        '24h': { validated: true, score: cell.forecast_24h },
        '6h': { validated: false, score: cell.forecast_6h },
        '48h': { validated: false, score: cell.forecast_48h },
        '72h': { validated: false, score: cell.forecast_72h },
      },
      environmental_observations: {
        rainfall_24h_mm: cell.observation.rainfall_24h_mm,
        rainfall_72h_mm: cell.observation.rainfall_72h_mm,
        soil_moisture: cell.observation.soil_moisture,
        source: cell.observation.source,
        observed_at: cell.observation.observed_at,
        data_quality: cell.data_quality,
        stale: cell.observation.stale,
      },
      explanation: cell.explanation,
      data_quality: cell.data_quality,
      confidence: cell.confidence,
    };
  }
}

// ============================================================================
// HTTP ML Adapter (Communicates with Python FastAPI / ML Inference Service)
// ============================================================================

export class HttpMLAdapter implements IMLAdapter {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl: string, timeoutMs = 3000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  async isLiveAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async getPointPrediction(lat: number, lon: number): Promise<MLPredictionResult | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      // Support either GET /api/v1/risk/:latitude/:longitude or POST /api/v1/risk/point
      const res = await fetch(`${this.baseUrl}/api/v1/risk/${lat}/${lon}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[HttpMLAdapter] ML service returned status ${res.status}`);
        return null;
      }

      const data = (await res.json()) as any;
      return this.mapHttpPayloadToResult(data, lat, lon);
    } catch (err: any) {
      console.warn(`[HttpMLAdapter] ML service request failed: ${err.message}`);
      return null;
    }
  }

  async getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]> {
    // Spatial grid calculation delegates to precomputed/seeded PostGIS layer or mock
    return mockMlAdapter.getGridPredictions(bbox, minRisk);
  }

  async getZonePrediction(cellId: string): Promise<MockRiskCell | null> {
    return mockMlAdapter.getZonePrediction(cellId);
  }

  private mapHttpPayloadToResult(data: any, lat: number, lon: number): MLPredictionResult {
    const baseSusc =
      data.base_susceptibility?.score ??
      data.base_susceptibility ??
      50;

    const currentRisk =
      data.dynamic_risk?.current_risk ??
      data.current_risk ??
      50;

    const risk24h =
      data.dynamic_risk?.risk_24h ??
      data.risk_24h ??
      null;

    const suscVersion =
      data.metadata?.model_version_susceptibility ??
      'susceptibility_xgboost_v1:v1.0';

    const riskVersion =
      data.metadata?.model_version_dynamic_risk ??
      'dynamic_risk_xgboost_v1:v1.0';

    const combinedVersion = `${suscVersion}+${riskVersion}`;

    return {
      source: 'live_ml',
      model_id: 'dynamic_risk_xgboost_v1',
      model_version: combinedVersion,
      model_version_susceptibility: suscVersion,
      model_version_dynamic_risk: riskVersion,
      prediction_id: data.prediction_id || `PRD_LIVE_${Date.now()}`,
      latitude: lat,
      longitude: lon,
      cell_id: data.cell_id ?? null,
      base_susceptibility: baseSusc,
      current_risk: currentRisk,
      risk_24h: risk24h,
      forecast_24h: risk24h,
      horizons_supported: data.dynamic_risk?.horizons ?? {
        current: { validated: true, score: currentRisk },
        '24h': { validated: true, score: risk24h },
        '6h': { validated: false, score: null },
        '48h': { validated: false, score: null },
        '72h': { validated: false, score: null },
      },
      environmental_observations: {
        rainfall_24h_mm: data.environmental_observations?.rainfall_24h_mm ?? null,
        soil_moisture: data.environmental_observations?.soil_moisture ?? null,
        forecast_rain_24h_mm: data.environmental_observations?.forecast_rain_24h_mm ?? null,
        source: data.environmental_observations?.source ?? 'IMD/GPM',
        data_quality: data.environmental_observations?.data_quality ?? 'GOOD',
        stale: data.environmental_observations?.stale ?? false,
      },
      explanation: data.explanation,
      data_quality: data.environmental_observations?.data_quality || 'GOOD',
      confidence: data.confidence ?? null,
    };
  }
}

// ============================================================================
// Composite ML Adapter (Manages Live HTTP Adapter + Mock Fallback)
// ============================================================================

export class CompositeMLAdapter implements IMLAdapter {
  private primaryAdapter: IMLAdapter | null;
  private fallbackAdapter: IMLAdapter;

  constructor(fallbackAdapter: IMLAdapter, primaryAdapter?: IMLAdapter | null) {
    this.fallbackAdapter = fallbackAdapter;
    this.primaryAdapter = primaryAdapter || null;
  }

  setPrimaryAdapter(adapter: IMLAdapter | null): void {
    this.primaryAdapter = adapter;
  }

  async isLiveAvailable(): Promise<boolean> {
    if (!this.primaryAdapter) return false;
    return this.primaryAdapter.isLiveAvailable();
  }

  async getPointPrediction(lat: number, lon: number): Promise<MLPredictionResult | null> {
    if (this.primaryAdapter) {
      try {
        const liveResult = await this.primaryAdapter.getPointPrediction(lat, lon);
        if (liveResult) {
          return liveResult;
        }
      } catch (err: any) {
        console.warn(`[CompositeMLAdapter] Primary ML adapter failed (${err.message}), falling back to mock adapter.`);
      }
    }

    const fallbackResult = await this.fallbackAdapter.getPointPrediction(lat, lon);
    if (fallbackResult && this.primaryAdapter) {
      // If primary adapter was configured but failed, mark data quality as degraded
      return {
        ...fallbackResult,
        data_quality: 'DEGRADED',
      };
    }
    return fallbackResult;
  }

  async getGridPredictions(bbox: BoundingBox, minRisk?: number): Promise<MockRiskCell[]> {
    return this.fallbackAdapter.getGridPredictions(bbox, minRisk);
  }

  async getZonePrediction(cellId: string): Promise<MockRiskCell | null> {
    return this.fallbackAdapter.getZonePrediction(cellId);
  }
}

// Singletons for export
export const mockMlAdapter = new MockMLAdapter();

export const httpMlAdapter = config.ML_ADAPTER_URL
  ? new HttpMLAdapter(config.ML_ADAPTER_URL)
  : null;

export const mlAdapter = new CompositeMLAdapter(mockMlAdapter, httpMlAdapter);
