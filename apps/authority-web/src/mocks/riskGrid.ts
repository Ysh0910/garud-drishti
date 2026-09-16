import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

/**
 * SYNTHETIC DEMO DATA. Shape matches contracts/examples/risk-zone.json
 * (a RiskZoneFeature GeoJSON FeatureCollection). Coordinates are illustrative
 * placements near the real settlements named in ZONE_SUMMARIES, not surveyed geometry.
 */
export interface RiskZoneProperties {
  cell_id: string;
  base_susceptibility: number;
  risk_score: number;
  risk_level: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  risk_state: string;
  response_priority: string;
  trend: string;
  confidence: number | null;
  data_quality: string;
  updated_at: string;
  model_version: string;
}

function square(lon: number, lat: number, half: number): Polygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon - half, lat - half],
        [lon + half, lat - half],
        [lon + half, lat + half],
        [lon - half, lat + half],
        [lon - half, lat - half],
      ],
    ],
  };
}

function feature(
  cell_id: string,
  lon: number,
  lat: number,
  half: number,
  risk_score: number,
  risk_level: RiskZoneProperties['risk_level'],
): Feature<Polygon, RiskZoneProperties> {
  return {
    type: 'Feature',
    geometry: square(lon, lat, half),
    properties: {
      cell_id,
      base_susceptibility: Math.max(10, risk_score - 8),
      risk_score,
      risk_level,
      risk_state: risk_level,
      response_priority: risk_level === 'CRITICAL' || risk_level === 'HIGH' ? 'HIGH' : 'MEDIUM',
      trend: 'INCREASING',
      confidence: null,
      data_quality: 'DEGRADED',
      updated_at: '2026-09-13T14:30:00Z',
      model_version: 'dynamic_xgb_v1',
    },
  };
}

export const RISK_GRID: FeatureCollection<Polygon, RiskZoneProperties> = {
  type: 'FeatureCollection',
  features: [
    feature('NER-ML-042', 91.7323, 25.2702, 0.06, 87, 'CRITICAL'),
    feature('NER-ML-051', 91.5822, 25.2977, 0.06, 81, 'CRITICAL'),
    feature('NER-MZ-118', 92.8395, 23.3041, 0.05, 74, 'HIGH'),
    feature('NER-AR-007', 95.8434, 28.5, 0.07, 69, 'HIGH'),
    feature('NER-SK-023', 88.5322, 27.5115, 0.05, 52, 'MODERATE'),
    feature('NER-MN-064', 93.5028, 24.9836, 0.05, 44, 'MODERATE'),
    feature('NER-NL-031', 94.4931, 25.6634, 0.05, 28, 'LOW'),
  ],
};

export interface CitizenReportPointProperties {
  report_id: string;
  status: string;
}

export const CITIZEN_REPORT_POINTS: FeatureCollection<Point, CitizenReportPointProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.7362, 25.2688] },
      properties: { report_id: 'CR-2291', status: 'PENDING' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.7286, 25.2611] },
      properties: { report_id: 'CR-2288', status: 'PENDING' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [91.7052, 25.2984] },
      properties: { report_id: 'CR-2280', status: 'VERIFIED' },
    },
  ],
};

export const NER_BOUNDS: [[number, number], [number, number]] = [
  [87.5, 21.5],
  [97.5, 29.5],
];

/**
 * Approximate real bounding boxes for each NER state — for map navigation only
 * (zooming the view), not surveyed/authoritative administrative boundaries.
 */
export const STATE_BOUNDS: Record<string, [[number, number], [number, number]]> = {
  'Arunachal Pradesh': [
    [91.6, 26.6],
    [97.4, 29.4],
  ],
  Assam: [
    [89.7, 24.1],
    [96.0, 28.2],
  ],
  Manipur: [
    [93.0, 23.8],
    [94.8, 25.7],
  ],
  Meghalaya: [
    [89.8, 25.0],
    [92.8, 26.1],
  ],
  Mizoram: [
    [92.2, 21.9],
    [93.5, 24.5],
  ],
  Nagaland: [
    [93.3, 25.2],
    [95.3, 27.1],
  ],
  Sikkim: [
    [88.0, 27.0],
    [88.9, 28.2],
  ],
  Tripura: [
    [91.1, 22.9],
    [92.4, 24.5],
  ],
};
