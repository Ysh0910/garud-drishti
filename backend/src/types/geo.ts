// ============================================================================
// GeoJSON Type Definitions (RFC 7946)
// ============================================================================

export type Position = [number, number] | [number, number, number];

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: Position;
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Position[];
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface GeoJsonMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type GeoJsonGeometry =
  | GeoJsonPoint
  | GeoJsonLineString
  | GeoJsonPolygon
  | GeoJsonMultiPolygon;

export interface GeoJsonFeature<G = GeoJsonGeometry, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties: P;
  id?: string | number;
}

export interface GeoJsonFeatureCollection<G = GeoJsonGeometry, P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<G, P>[];
  crs?: {
    type: 'name';
    properties: { name: string };
  };
  meta?: Record<string, unknown>;
}
