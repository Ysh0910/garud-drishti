import {
  AssetType,
  RiskLevel,
  Trend,
  GeoJsonGeometry,
} from '../types';


export interface MockAssetItem {
  asset_id: string;
  asset_type: AssetType;
  name: string;
  road_class?: string;
  population?: number | null;
  geometry: GeoJsonGeometry;
  nearest_cell_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  risk_trend?: Trend;
  risk_24h?: number;
  road_access_risk?: RiskLevel;
  nearby_reports?: number;
  updated_at: string;
}

export const MOCK_EXPOSURE_ASSETS: MockAssetItem[] = [
  // Roads
  {
    asset_id: 'ROAD_NH10_001',
    asset_type: 'ROAD',
    name: 'NH-10 (Sevoke to Gangtok Highway)',
    road_class: 'NH',
    geometry: {
      type: 'LineString',
      coordinates: [
        [88.58, 27.28],
        [88.60, 27.31],
        [88.61, 27.33],
        [88.62, 27.35],
      ],
    },
    nearest_cell_id: 'CELL_NER_001',
    risk_score: 88,
    risk_level: 'CRITICAL',
    risk_trend: 'INCREASING',
    nearby_reports: 2,
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'ROAD_SH03_002',
    asset_type: 'ROAD',
    name: 'SH-3 (Singtam-Dikchu Link Road)',
    road_class: 'SH',
    geometry: {
      type: 'LineString',
      coordinates: [
        [88.55, 27.25],
        [88.58, 27.28],
        [88.60, 27.30],
      ],
    },
    nearest_cell_id: 'CELL_NER_002',
    risk_score: 68,
    risk_level: 'HIGH',
    risk_trend: 'INCREASING',
    nearby_reports: 1,
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'ROAD_LOCAL_003',
    asset_type: 'ROAD',
    name: 'Ranipool Valley Access Road',
    road_class: 'LOCAL',
    geometry: {
      type: 'LineString',
      coordinates: [
        [88.63, 27.29],
        [88.64, 27.30],
        [88.65, 27.31],
      ],
    },
    nearest_cell_id: 'CELL_NER_004',
    risk_score: 18,
    risk_level: 'VERY_LOW',
    risk_trend: 'STABLE',
    nearby_reports: 0,
    updated_at: new Date().toISOString(),
  },

  // Villages / Settlements
  {
    asset_id: 'VILL_MANGAN_001',
    asset_type: 'VILLAGE',
    name: 'Mangan Town',
    population: 4600,
    geometry: {
      type: 'Point',
      coordinates: [88.53, 27.51],
    },
    nearest_cell_id: 'CELL_NER_001',
    risk_score: 85,
    risk_level: 'CRITICAL',
    risk_24h: 90,
    road_access_risk: 'CRITICAL',
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'VILL_DEORALI_002',
    asset_type: 'VILLAGE',
    name: 'Deorali Settlement',
    population: 3200,
    geometry: {
      type: 'Point',
      coordinates: [88.59, 27.31],
    },
    nearest_cell_id: 'CELL_NER_003',
    risk_score: 42,
    risk_level: 'MODERATE',
    risk_24h: 50,
    road_access_risk: 'HIGH',
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'VILL_RANIPOOL_003',
    asset_type: 'VILLAGE',
    name: 'Ranipool Village',
    population: 2800,
    geometry: {
      type: 'Point',
      coordinates: [88.65, 27.31],
    },
    nearest_cell_id: 'CELL_NER_004',
    risk_score: 18,
    risk_level: 'VERY_LOW',
    risk_24h: 22,
    road_access_risk: 'LOW',
    updated_at: new Date().toISOString(),
  },

  // Healthcare / Critical Assets
  {
    asset_id: 'HOSP_STNM_001',
    asset_type: 'HOSPITAL',
    name: 'STNM Multi-Speciality Hospital',
    geometry: {
      type: 'Point',
      coordinates: [88.61, 27.33],
    },
    nearest_cell_id: 'CELL_NER_001',
    risk_score: 88,
    risk_level: 'CRITICAL',
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'SCH_GANGTOK_001',
    asset_type: 'SCHOOL',
    name: 'Tashi Namgyal Senior Secondary Academy',
    geometry: {
      type: 'Point',
      coordinates: [88.62, 27.34],
    },
    nearest_cell_id: 'CELL_NER_001',
    risk_score: 88,
    risk_level: 'CRITICAL',
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'PWR_DIKCHU_001',
    asset_type: 'POWER_INFRASTRUCTURE',
    name: 'Dikchu 96MW Hydro Substation',
    geometry: {
      type: 'Point',
      coordinates: [88.57, 27.36],
    },
    nearest_cell_id: 'CELL_NER_002',
    risk_score: 68,
    risk_level: 'HIGH',
    updated_at: new Date().toISOString(),
  },
  {
    asset_id: 'BRG_TEESTA_001',
    asset_type: 'BRIDGE',
    name: 'Teesta Stage-V Suspension Bridge',
    geometry: {
      type: 'Point',
      coordinates: [88.54, 27.27],
    },
    nearest_cell_id: 'CELL_NER_002',
    risk_score: 68,
    risk_level: 'HIGH',
    updated_at: new Date().toISOString(),
  },
];

/**
 * Calculates Haversine distance in metres between two WGS84 coordinate pairs.
 */
export function calculateHaversineDistanceM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
