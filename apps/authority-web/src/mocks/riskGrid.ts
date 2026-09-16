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
  /** Precomputed once here rather than as a null-check inside a MapLibre style expression. */
  confidence_tier: 'high' | 'low' | 'unknown';
  data_quality: string;
  updated_at: string;
  model_version: string;
  district: string;
  state: string;
}

function confidenceTier(confidence: number | null): RiskZoneProperties['confidence_tier'] {
  if (confidence == null) return 'unknown';
  return confidence >= 0.7 ? 'high' : 'low';
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
  confidence: number | null,
  district: string,
  state: string,
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
      confidence,
      confidence_tier: confidenceTier(confidence),
      data_quality: 'DEGRADED',
      updated_at: '2026-09-13T14:30:00Z',
      model_version: 'dynamic_xgb_v1',
      district,
      state,
    },
  };
}

// Confidence values match the ones already shown elsewhere (SituationReportPage's
// priority table) rather than inventing new numbers for the same zones.
export const RISK_GRID: FeatureCollection<Polygon, RiskZoneProperties> = {
  type: 'FeatureCollection',
  features: [
    feature('NER-ML-042', 91.7323, 25.2702, 0.06, 87, 'CRITICAL', null, 'East Khasi Hills', 'Meghalaya'),
    feature('NER-ML-051', 91.5822, 25.2977, 0.06, 81, 'CRITICAL', 0.68, 'East Khasi Hills', 'Meghalaya'),
    feature('NER-MZ-118', 92.8395, 23.3041, 0.05, 74, 'HIGH', 0.72, 'Serchhip', 'Mizoram'),
    feature('NER-AR-007', 95.8434, 28.5, 0.07, 69, 'HIGH', 0.61, 'Dibang Valley', 'Arunachal Pradesh'),
    feature('NER-SK-023', 88.5322, 27.5115, 0.05, 52, 'MODERATE', 0.77, 'Mangan', 'Sikkim'),
    feature('NER-MN-064', 93.5028, 24.9836, 0.05, 44, 'MODERATE', null, 'Tamenglong', 'Manipur'),
    feature('NER-NL-031', 94.4931, 25.6634, 0.05, 28, 'LOW', null, 'Phek', 'Nagaland'),
  ],
};

/**
 * Real district-level aggregation (mean risk score of member zones) rendered as
 * proportional circles at each district's centroid — NOT fake district boundary
 * polygons. We don't have surveyed district boundaries for the whole region
 * (checked data/raw/boundaries/: GADM and OSM extracts only cover state-level
 * admin boundaries here), so drawing invented polygon shapes would misrepresent
 * them as real administrative boundaries. The aggregation math itself is real.
 */
export interface DistrictAggregateProperties {
  district: string;
  state: string;
  avg_risk_score: number;
  risk_level: RiskZoneProperties['risk_level'];
  zone_count: number;
  top_cell_id: string; // highest-risk member zone, used when the marker is clicked
}

/** Canonical score→band thresholds per contracts/enums.md RiskLevel. */
export function scoreToRiskLevel(score: number): RiskZoneProperties['risk_level'] {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'HIGH';
  if (score >= 41) return 'MODERATE';
  if (score >= 21) return 'LOW';
  return 'VERY_LOW';
}

export function buildDistrictAggregates(
  customFeatures?: Feature<Polygon, RiskZoneProperties>[],
): FeatureCollection<Point, DistrictAggregateProperties> {
  const sourceFeatures = customFeatures && customFeatures.length > 0 ? customFeatures : RISK_GRID.features;
  const groups = new Map<string, Feature<Polygon, RiskZoneProperties>[]>();
  for (const f of sourceFeatures) {
    const state = f.properties.state || (f.properties as any).state || 'Sikkim';
    const district = f.properties.district || (f.properties as any).district || 'East Sikkim';
    const key = `${state}::${district}`;
    const list = groups.get(key) ?? [];
    list.push(f);
    groups.set(key, list);
  }

  const features: Feature<Point, DistrictAggregateProperties>[] = [];
  for (const [key, members] of groups) {
    const [state, district] = key.split('::');
    const avgScore = members.reduce((sum, m) => sum + (m.properties.risk_score ?? 0), 0) / members.length;
    const centroidLon = members.reduce((sum, m) => {
      const r = m.geometry?.coordinates?.[0];
      return sum + (r ? r[0][0] : 88.5);
    }, 0) / members.length;
    const centroidLat = members.reduce((sum, m) => {
      const r = m.geometry?.coordinates?.[0];
      return sum + (r ? r[0][1] : 27.3);
    }, 0) / members.length;
    const top = [...members].sort((a, b) => (b.properties.risk_score ?? 0) - (a.properties.risk_score ?? 0))[0];

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [centroidLon, centroidLat] },
      properties: {
        district,
        state,
        avg_risk_score: Math.round(avgScore),
        risk_level: scoreToRiskLevel(avgScore),
        zone_count: members.length,
        top_cell_id: top.properties.cell_id,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}


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
