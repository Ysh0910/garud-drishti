import { RiskLevel, RiskState, ResponsePriority, Trend, DataQuality, GeoJsonPolygon } from '../types';

export interface MockRiskCell {
  cell_id: string;
  name: string;
  geometry: GeoJsonPolygon;
  base_susceptibility: number;
  current_risk: number;
  risk_level: RiskLevel;
  risk_state: RiskState;
  response_priority: ResponsePriority;
  trend: Trend;
  confidence: number | null;
  data_quality: DataQuality;
  forecast_6h: number;
  forecast_24h: number;
  forecast_48h: number;
  forecast_72h: number;
  model_version: string;
  updated_at: string;
  terrain: {
    elevation_m: number;
    slope_deg: number;
    aspect_deg: number;
    curvature: number;
    landcover: string;
    geology: string;
    geomorphology: string;
    hydrological_condition: string;
    distance_to_drainage_m: number;
    historical_ls_density: number;
    distance_to_historical_ls_m: number;
  };
  observation: {
    rainfall_24h_mm: number;
    rainfall_72h_mm: number;
    soil_moisture: number;
    source: string;
    observed_at: string;
    stale: boolean;
  };
  explanation?: {
    top_factors: Array<{
      feature: string;
      direction: 'POSITIVE' | 'NEGATIVE';
      shap_value: number;
    }>;
    explanation_version: string;
  };
}

export const MOCK_RISK_CELLS: MockRiskCell[] = [
  {
    cell_id: 'CELL_NER_001',
    name: 'Gangtok North (NH-10 corridor)',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [88.60, 27.32],
          [88.62, 27.32],
          [88.62, 27.34],
          [88.60, 27.34],
          [88.60, 27.32],
        ],
      ],
    },
    base_susceptibility: 65,
    current_risk: 88,
    risk_level: 'CRITICAL',
    risk_state: 'CRITICAL',
    response_priority: 'IMMEDIATE',
    trend: 'INCREASING',
    confidence: 0.89,
    data_quality: 'GOOD',
    forecast_6h: 85,
    forecast_24h: 92,
    forecast_48h: 78,
    forecast_72h: 65,
    model_version: 'dynamic_xgb_v1',
    updated_at: new Date().toISOString(),
    terrain: {
      elevation_m: 1450.0,
      slope_deg: 34.5,
      aspect_deg: 142.0,
      curvature: 0.045,
      landcover: 'forest_degraded',
      geology: 'gneiss_schist',
      geomorphology: 'steep_structural_slope',
      hydrological_condition: 'high_pore_pressure',
      distance_to_drainage_m: 120.0,
      historical_ls_density: 3.4,
      distance_to_historical_ls_m: 250.0,
    },
    observation: {
      rainfall_24h_mm: 142.5,
      rainfall_72h_mm: 265.0,
      soil_moisture: 0.38,
      source: 'IMD',
      observed_at: new Date().toISOString(),
      stale: false,
    },
    explanation: {
      top_factors: [
        { feature: 'rainfall_72h_mm', direction: 'POSITIVE', shap_value: 0.32 },
        { feature: 'slope_deg', direction: 'POSITIVE', shap_value: 0.28 },
        { feature: 'base_susceptibility', direction: 'POSITIVE', shap_value: 0.21 },
        { feature: 'rainfall_24h_mm', direction: 'POSITIVE', shap_value: 0.15 },
        { feature: 'distance_to_drainage_m', direction: 'NEGATIVE', shap_value: -0.06 },
      ],
      explanation_version: 'shap_tree_v1.0',
    },
  },
  {
    cell_id: 'CELL_NER_002',
    name: 'Tathangchen Ridge',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [88.62, 27.32],
          [88.64, 27.32],
          [88.64, 27.34],
          [88.62, 27.34],
          [88.62, 27.32],
        ],
      ],
    },
    base_susceptibility: 45,
    current_risk: 68,
    risk_level: 'HIGH',
    risk_state: 'HIGH',
    response_priority: 'HIGH',
    trend: 'INCREASING',
    confidence: 0.82,
    data_quality: 'GOOD',
    forecast_6h: 72,
    forecast_24h: 75,
    forecast_48h: 60,
    forecast_72h: 50,
    model_version: 'dynamic_xgb_v1',
    updated_at: new Date().toISOString(),
    terrain: {
      elevation_m: 1680.0,
      slope_deg: 26.0,
      aspect_deg: 95.0,
      curvature: 0.012,
      landcover: 'dense_vegetation',
      geology: 'phyllite',
      geomorphology: 'moderate_slope',
      hydrological_condition: 'moderate_seepage',
      distance_to_drainage_m: 350.0,
      historical_ls_density: 1.8,
      distance_to_historical_ls_m: 600.0,
    },
    observation: {
      rainfall_24h_mm: 95.0,
      rainfall_72h_mm: 180.0,
      soil_moisture: 0.31,
      source: 'IMD',
      observed_at: new Date().toISOString(),
      stale: false,
    },
    explanation: {
      top_factors: [
        { feature: 'rainfall_24h_mm', direction: 'POSITIVE', shap_value: 0.24 },
        { feature: 'slope_deg', direction: 'POSITIVE', shap_value: 0.19 },
        { feature: 'landcover', direction: 'NEGATIVE', shap_value: -0.12 },
      ],
      explanation_version: 'shap_tree_v1.0',
    },
  },
  {
    cell_id: 'CELL_NER_003',
    name: 'Deorali Slope',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [88.58, 27.30],
          [88.60, 27.30],
          [88.60, 27.32],
          [88.58, 27.32],
          [88.58, 27.30],
        ],
      ],
    },
    base_susceptibility: 30,
    current_risk: 42,
    risk_level: 'MODERATE',
    risk_state: 'WATCH',
    response_priority: 'MEDIUM',
    trend: 'STABLE',
    confidence: 0.75,
    data_quality: 'GOOD',
    forecast_6h: 45,
    forecast_24h: 50,
    forecast_48h: 40,
    forecast_72h: 35,
    model_version: 'dynamic_xgb_v1',
    updated_at: new Date().toISOString(),
    terrain: {
      elevation_m: 1300.0,
      slope_deg: 18.0,
      aspect_deg: 180.0,
      curvature: 0.002,
      landcover: 'urban_settlement',
      geology: 'mica_schist',
      geomorphology: 'gentle_slope',
      hydrological_condition: 'controlled_drainage',
      distance_to_drainage_m: 500.0,
      historical_ls_density: 0.8,
      distance_to_historical_ls_m: 1200.0,
    },
    observation: {
      rainfall_24h_mm: 55.0,
      rainfall_72h_mm: 110.0,
      soil_moisture: 0.25,
      source: 'IMD',
      observed_at: new Date().toISOString(),
      stale: false,
    },
  },
  {
    cell_id: 'CELL_NER_004',
    name: 'Ranipool Valley',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [88.64, 27.30],
          [88.66, 27.30],
          [88.66, 27.32],
          [88.64, 27.32],
          [88.64, 27.30],
        ],
      ],
    },
    base_susceptibility: 15,
    current_risk: 18,
    risk_level: 'VERY_LOW',
    risk_state: 'NORMAL',
    response_priority: 'LOW',
    trend: 'STABLE',
    confidence: null,
    data_quality: 'GOOD',
    forecast_6h: 20,
    forecast_24h: 22,
    forecast_48h: 18,
    forecast_72h: 15,
    model_version: 'dynamic_xgb_v1',
    updated_at: new Date().toISOString(),
    terrain: {
      elevation_m: 950.0,
      slope_deg: 8.0,
      aspect_deg: 210.0,
      curvature: -0.005,
      landcover: 'valley_floor',
      geology: 'alluvium',
      geomorphology: 'valley',
      hydrological_condition: 'low_gradient',
      distance_to_drainage_m: 80.0,
      historical_ls_density: 0.1,
      distance_to_historical_ls_m: 3500.0,
    },
    observation: {
      rainfall_24h_mm: 35.0,
      rainfall_72h_mm: 70.0,
      soil_moisture: 0.22,
      source: 'IMD',
      observed_at: new Date().toISOString(),
      stale: false,
    },
  },
];
