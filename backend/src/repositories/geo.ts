// ============================================================================
// PostGIS Geospatial Query Helpers
// ============================================================================

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * Returns SQL snippet converting a PostGIS geometry column to GeoJSON string/object.
 */
export function sqlAsGeoJson(col = 'geometry', alias = 'geometry'): string {
  return `ST_AsGeoJSON(${col})::json AS ${alias}`;
}

/**
 * Generates SQL condition for viewport bounding box intersection.
 * ST_MakeEnvelope(west, south, east, north, 4326)
 */
export function sqlBboxIntersects(
  paramStartIndex: number,
  geomCol = 'geometry',
): {
  clause: string;
  nextIndex: number;
} {
  return {
    clause: `ST_Intersects(${geomCol}, ST_MakeEnvelope($${paramStartIndex}, $${paramStartIndex + 1}, $${paramStartIndex + 2}, $${paramStartIndex + 3}, 4326))`,
    nextIndex: paramStartIndex + 4,
  };
}

/**
 * Generates SQL condition for point containment (e.g. which cell contains this point).
 */
export function sqlPointContains(
  paramStartIndex: number,
  geomCol = 'geometry',
): {
  clause: string;
  nextIndex: number;
} {
  return {
    clause: `ST_Contains(${geomCol}, ST_SetSRID(ST_Point($${paramStartIndex}, $${paramStartIndex + 1}), 4326))`,
    nextIndex: paramStartIndex + 2,
  };
}

/**
 * Generates SQL condition for geodesic radius search (meters).
 */
export function sqlDistanceWithin(
  paramStartIndex: number,
  geomCol = 'geometry',
): {
  clause: string;
  distanceSelect: string;
  nextIndex: number;
} {
  return {
    clause: `ST_DWithin(${geomCol}::geography, ST_SetSRID(ST_Point($${paramStartIndex}, $${paramStartIndex + 1}), 4326)::geography, $${paramStartIndex + 2})`,
    distanceSelect: `ST_Distance(${geomCol}::geography, ST_SetSRID(ST_Point($${paramStartIndex}, $${paramStartIndex + 1}), 4326)::geography) AS distance_m`,
    nextIndex: paramStartIndex + 3,
  };
}
