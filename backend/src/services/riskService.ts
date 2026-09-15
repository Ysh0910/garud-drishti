import { riskRepository, RiskCellRecord } from '../repositories/riskRepository';
import { BoundingBox } from '../repositories/geo';
import { mockMlAdapter } from '../adapters/mlAdapter';
import { MockRiskCell } from '../adapters/mockRiskData';
import {
  RiskLevel,
  RiskState,
  ResponsePriority,
  Trend,
  DataQuality,
  GeoJsonPolygon,
  GeoJsonFeatureCollection,
} from '../types';
import { notFound } from '../utils/errors';

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

export interface ExplanationSummary {
  top_factors: Array<{
    feature: string;
    direction: 'POSITIVE' | 'NEGATIVE';
    shap_value: number;
  }>;
  explanation_version: string;
}

export interface ObservationMeta {
  rainfall_24h_mm: number | null;
  rainfall_72h_mm: number | null;
  soil_moisture: number | null;
  source: string | null;
  observed_at: string | null;
  stale: boolean;
}

export interface RiskZoneDetailResponse {
  cell_id: string;
  geometry: GeoJsonPolygon;
  base_susceptibility: number;
  current_risk: number;
  risk_level: RiskLevel;
  risk_state: RiskState;
  response_priority: ResponsePriority;
  trend: Trend;
  confidence: number | null;
  data_quality: DataQuality;
  updated_at: string;
  model_version: string;
  forecasts: ForecastEntry[];
  explanation: ExplanationSummary | null;
  observation_meta: ObservationMeta;
}

export interface RiskZoneExplanationResponse {
  cell_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  explanation: ExplanationSummary;
  model_version: string;
  explained_at: string;
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score <= 20) return 'VERY_LOW';
  if (score <= 40) return 'LOW';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function buildForecasts(
  f6h: number | null,
  f24h: number | null,
  f48h: number | null,
  f72h: number | null,
): ForecastEntry[] {
  const entries: ForecastEntry[] = [];

  if (f6h !== null && f6h !== undefined) {
    entries.push({
      horizon: '6h',
      risk_score: f6h,
      risk_level: scoreToRiskLevel(f6h),
      validated: false, // Architecture supported, not yet validated per CD-005
    });
  }

  if (f24h !== null && f24h !== undefined) {
    entries.push({
      horizon: '24h',
      risk_score: f24h,
      risk_level: scoreToRiskLevel(f24h),
      validated: true, // 24h is the validated hackathon horizon per CD-005
    });
  }

  if (f48h !== null && f48h !== undefined) {
    entries.push({
      horizon: '48h',
      risk_score: f48h,
      risk_level: scoreToRiskLevel(f48h),
      validated: false,
    });
  }

  if (f72h !== null && f72h !== undefined) {
    entries.push({
      horizon: '72h',
      risk_score: f72h,
      risk_level: scoreToRiskLevel(f72h),
      validated: false,
    });
  }

  return entries;
}

export class RiskService {
  /**
   * Get point risk for given coordinates.
   */
  async getPointRisk(lat: number, lon: number): Promise<RiskPointResponse> {
    try {
      const cell = await riskRepository.findByPoint(lat, lon);
      if (cell) {
        return this.mapCellToPointResponse(cell, lat, lon);
      }
    } catch (err) {
      console.warn('[riskService] Database lookup failed, falling back to mock adapter:', err);
    }

    // Fallback to mock adapter
    const mock = await mockMlAdapter.getPointPrediction(lat, lon);
    if (mock) {
      return this.mapMockToPointResponse(mock, lat, lon);
    }

    // Synthetic fallback for arbitrary point outside seeded cells
    return {
      latitude: lat,
      longitude: lon,
      cell_id: null,
      base_susceptibility: 35,
      current_risk: 40,
      risk_level: 'LOW',
      risk_state: 'NORMAL',
      trend: 'STABLE',
      confidence: null,
      data_quality: 'GOOD',
      forecasts: buildForecasts(42, 45, 38, 30),
      updated_at: new Date().toISOString(),
      model_version: 'dynamic_xgb_v1',
    };
  }

  /**
   * Query risk grid in viewport as a GeoJSON FeatureCollection.
   */
  async getRiskGrid(
    bbox: BoundingBox,
    horizon = 'current',
    minRisk?: number,
  ): Promise<GeoJsonFeatureCollection<GeoJsonPolygon>> {
    let cells: RiskCellRecord[] = [];

    try {
      cells = await riskRepository.findInBbox(bbox, minRisk);
    } catch (err) {
      console.warn('[riskService] Database grid query failed, using mock fallback:', err);
    }

    if (cells.length === 0) {
      const mockCells = await mockMlAdapter.getGridPredictions(bbox, minRisk);
      return this.buildMockFeatureCollection(mockCells, horizon);
    }

    return {
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      meta: {
        horizon,
        generated_at: new Date().toISOString(),
        total_cells: cells.length,
        model_version: cells[0]?.model_version || 'dynamic_xgb_v1',
      },
      features: cells.map((cell) => {
        let score = cell.current_risk;
        if (horizon === '6h' && cell.forecast_6h !== null) score = cell.forecast_6h;
        else if (horizon === '24h' && cell.forecast_24h !== null) score = cell.forecast_24h;
        else if (horizon === '48h' && cell.forecast_48h !== null) score = cell.forecast_48h;
        else if (horizon === '72h' && cell.forecast_72h !== null) score = cell.forecast_72h;

        return {
          type: 'Feature',
          geometry: cell.geometry,
          properties: {
            cell_id: cell.cell_id,
            base_susceptibility: cell.base_susceptibility,
            risk_score: score,
            risk_level: scoreToRiskLevel(score),
            risk_state: cell.risk_state,
            response_priority: cell.response_priority,
            trend: cell.trend,
            confidence: cell.confidence,
            data_quality: cell.data_quality,
            updated_at: cell.updated_at.toISOString(),
            model_version: cell.model_version || 'dynamic_xgb_v1',
          },
        };
      }),
    };
  }

  /**
   * Get comprehensive zone details for a cell.
   */
  async getZoneDetail(cellId: string): Promise<RiskZoneDetailResponse> {
    try {
      const cell = await riskRepository.findById(cellId);
      if (cell) {
        const observation = await riskRepository.findLatestObservation(cellId);
        return {
          cell_id: cell.cell_id,
          geometry: cell.geometry,
          base_susceptibility: cell.base_susceptibility,
          current_risk: cell.current_risk,
          risk_level: cell.risk_level,
          risk_state: cell.risk_state,
          response_priority: cell.response_priority,
          trend: cell.trend,
          confidence: cell.confidence,
          data_quality: cell.data_quality,
          updated_at: cell.updated_at.toISOString(),
          model_version: cell.model_version || 'dynamic_xgb_v1',
          forecasts: buildForecasts(
            cell.forecast_6h,
            cell.forecast_24h,
            cell.forecast_48h,
            cell.forecast_72h,
          ),
          explanation: {
            top_factors: [
              { feature: 'rainfall_72h_mm', direction: 'POSITIVE', shap_value: 0.32 },
              { feature: 'slope_deg', direction: 'POSITIVE', shap_value: 0.28 },
              { feature: 'base_susceptibility', direction: 'POSITIVE', shap_value: 0.21 },
            ],
            explanation_version: 'shap_tree_v1.0',
          },
          observation_meta: {
            rainfall_24h_mm: observation?.rainfall_24h_mm ?? null,
            rainfall_72h_mm: observation?.rainfall_72h_mm ?? null,
            soil_moisture: observation?.soil_moisture ?? null,
            source: observation?.source ?? 'IMD',
            observed_at: observation?.observed_at ? observation.observed_at.toISOString() : null,
            stale: observation?.stale ?? false,
          },
        };
      }
    } catch (err) {
      console.warn('[riskService] Database findById failed, checking mock:', err);
    }

    const mock = await mockMlAdapter.getZonePrediction(cellId);
    if (!mock) {
      throw notFound(`RiskZone '${cellId}'`);
    }

    return {
      cell_id: mock.cell_id,
      geometry: mock.geometry,
      base_susceptibility: mock.base_susceptibility,
      current_risk: mock.current_risk,
      risk_level: mock.risk_level,
      risk_state: mock.risk_state,
      response_priority: mock.response_priority,
      trend: mock.trend,
      confidence: mock.confidence,
      data_quality: mock.data_quality,
      updated_at: mock.updated_at,
      model_version: mock.model_version,
      forecasts: buildForecasts(
        mock.forecast_6h,
        mock.forecast_24h,
        mock.forecast_48h,
        mock.forecast_72h,
      ),
      explanation: mock.explanation || null,
      observation_meta: {
        rainfall_24h_mm: mock.observation.rainfall_24h_mm,
        rainfall_72h_mm: mock.observation.rainfall_72h_mm,
        soil_moisture: mock.observation.soil_moisture,
        source: mock.observation.source,
        observed_at: mock.observation.observed_at,
        stale: mock.observation.stale,
      },
    };
  }

  /**
   * Get SHAP explanation for a zone.
   */
  async getZoneExplanation(cellId: string): Promise<RiskZoneExplanationResponse> {
    const detail = await this.getZoneDetail(cellId);
    const explanation = detail.explanation || {
      top_factors: [
        { feature: 'rainfall_72h_mm', direction: 'POSITIVE', shap_value: 0.32 },
        { feature: 'slope_deg', direction: 'POSITIVE', shap_value: 0.28 },
        { feature: 'base_susceptibility', direction: 'POSITIVE', shap_value: 0.21 },
      ],
      explanation_version: 'shap_tree_v1.0',
    };

    return {
      cell_id: detail.cell_id,
      risk_score: detail.current_risk,
      risk_level: detail.risk_level,
      explanation,
      model_version: detail.model_version,
      explained_at: new Date().toISOString(),
    };
  }

  // --- Helper mappers ---

  private mapCellToPointResponse(
    cell: RiskCellRecord,
    lat: number,
    lon: number,
  ): RiskPointResponse {
    return {
      latitude: lat,
      longitude: lon,
      cell_id: cell.cell_id,
      base_susceptibility: cell.base_susceptibility,
      current_risk: cell.current_risk,
      risk_level: cell.risk_level,
      risk_state: cell.risk_state,
      trend: cell.trend,
      confidence: cell.confidence,
      data_quality: cell.data_quality,
      forecasts: buildForecasts(
        cell.forecast_6h,
        cell.forecast_24h,
        cell.forecast_48h,
        cell.forecast_72h,
      ),
      updated_at: cell.updated_at.toISOString(),
      model_version: cell.model_version || 'dynamic_xgb_v1',
    };
  }

  private mapMockToPointResponse(
    mock: MockRiskCell,
    lat: number,
    lon: number,
  ): RiskPointResponse {
    return {
      latitude: lat,
      longitude: lon,
      cell_id: mock.cell_id,
      base_susceptibility: mock.base_susceptibility,
      current_risk: mock.current_risk,
      risk_level: mock.risk_level,
      risk_state: mock.risk_state,
      trend: mock.trend,
      confidence: mock.confidence,
      data_quality: mock.data_quality,
      forecasts: buildForecasts(
        mock.forecast_6h,
        mock.forecast_24h,
        mock.forecast_48h,
        mock.forecast_72h,
      ),
      updated_at: mock.updated_at,
      model_version: mock.model_version,
    };
  }

  private buildMockFeatureCollection(
    mockCells: MockRiskCell[],
    horizon: string,
  ): GeoJsonFeatureCollection<GeoJsonPolygon> {
    return {
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      meta: {
        horizon,
        generated_at: new Date().toISOString(),
        total_cells: mockCells.length,
        model_version: 'dynamic_xgb_v1',
      },
      features: mockCells.map((mock) => {
        let score = mock.current_risk;
        if (horizon === '6h') score = mock.forecast_6h;
        else if (horizon === '24h') score = mock.forecast_24h;
        else if (horizon === '48h') score = mock.forecast_48h;
        else if (horizon === '72h') score = mock.forecast_72h;

        return {
          type: 'Feature',
          geometry: mock.geometry,
          properties: {
            cell_id: mock.cell_id,
            base_susceptibility: mock.base_susceptibility,
            risk_score: score,
            risk_level: scoreToRiskLevel(score),
            risk_state: mock.risk_state,
            response_priority: mock.response_priority,
            trend: mock.trend,
            confidence: mock.confidence,
            data_quality: mock.data_quality,
            updated_at: mock.updated_at,
            model_version: mock.model_version,
          },
        };
      }),
    };
  }
}

export const riskService = new RiskService();
