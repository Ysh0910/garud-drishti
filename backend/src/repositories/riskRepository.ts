import { query } from '../db/client';
import { sqlAsGeoJson, sqlBboxIntersects, BoundingBox } from './geo';
import { RiskLevel, RiskState, ResponsePriority, Trend, DataQuality, GeoJsonPolygon } from '../types';

export interface RiskCellRecord {
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
  forecast_6h: number | null;
  forecast_24h: number | null;
  forecast_48h: number | null;
  forecast_72h: number | null;
  model_version: string | null;
  updated_at: Date;
}

export interface TerrainFeaturesRecord {
  cell_id: string;
  elevation_m: number | null;
  slope_deg: number | null;
  aspect_deg: number | null;
  curvature: number | null;
  landcover: string | null;
  geology: string | null;
  geomorphology: string | null;
  hydrological_condition: string | null;
  distance_to_drainage_m: number | null;
  historical_ls_density: number | null;
  distance_to_historical_ls_m: number | null;
  updated_at: Date;
}

export interface LatestObservationRecord {
  cell_id: string;
  rainfall_1h_mm: number | null;
  rainfall_3h_mm: number | null;
  rainfall_6h_mm: number | null;
  rainfall_12h_mm: number | null;
  rainfall_24h_mm: number | null;
  rainfall_72h_mm: number | null;
  rainfall_7d_mm: number | null;
  soil_moisture: number | null;
  source: string | null;
  observed_at: Date;
  stale: boolean;
  quality: DataQuality;
}

export class RiskRepository {
  /**
   * Find risk cell by primary key (cell_id).
   */
  async findById(cellId: string): Promise<RiskCellRecord | null> {
    const res = await query<RiskCellRecord>(
      `SELECT 
        cell_id,
        ${sqlAsGeoJson('geometry', 'geometry')},
        base_susceptibility,
        current_risk,
        risk_level,
        risk_state,
        response_priority,
        trend,
        confidence,
        data_quality,
        forecast_6h,
        forecast_24h,
        forecast_48h,
        forecast_72h,
        model_version,
        updated_at
      FROM risk_cells
      WHERE cell_id = $1`,
      [cellId],
    );

    return res.rows[0] || null;
  }

  /**
   * Find containing risk cell for given coordinates (or nearest cell within tolerance).
   */
  async findByPoint(lat: number, lon: number): Promise<RiskCellRecord | null> {
    // 1. Check direct containment first
    const containsRes = await query<RiskCellRecord>(
      `SELECT 
        cell_id,
        ${sqlAsGeoJson('geometry', 'geometry')},
        base_susceptibility,
        current_risk,
        risk_level,
        risk_state,
        response_priority,
        trend,
        confidence,
        data_quality,
        forecast_6h,
        forecast_24h,
        forecast_48h,
        forecast_72h,
        model_version,
        updated_at
      FROM risk_cells
      WHERE ST_Contains(geometry, ST_SetSRID(ST_Point($1, $2), 4326))
      LIMIT 1`,
      [lon, lat],
    );

    if (containsRes.rows.length > 0) {
      return containsRes.rows[0];
    }

    // 2. Nearest neighbor fallback within 25km
    const nearestRes = await query<RiskCellRecord>(
      `SELECT 
        cell_id,
        ${sqlAsGeoJson('geometry', 'geometry')},
        base_susceptibility,
        current_risk,
        risk_level,
        risk_state,
        response_priority,
        trend,
        confidence,
        data_quality,
        forecast_6h,
        forecast_24h,
        forecast_48h,
        forecast_72h,
        model_version,
        updated_at
      FROM risk_cells
      WHERE ST_DWithin(geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 25000)
      ORDER BY ST_Distance(geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) ASC
      LIMIT 1`,
      [lon, lat],
    );

    return nearestRes.rows[0] || null;
  }

  /**
   * Query spatial grid cells within a bounding box.
   */
  async findInBbox(bbox: BoundingBox, minRisk?: number): Promise<RiskCellRecord[]> {
    const params: unknown[] = [bbox.west, bbox.south, bbox.east, bbox.north];
    const { clause } = sqlBboxIntersects(1, 'geometry');
    let sql = `
      SELECT 
        cell_id,
        ${sqlAsGeoJson('geometry', 'geometry')},
        base_susceptibility,
        current_risk,
        risk_level,
        risk_state,
        response_priority,
        trend,
        confidence,
        data_quality,
        forecast_6h,
        forecast_24h,
        forecast_48h,
        forecast_72h,
        model_version,
        updated_at
      FROM risk_cells
      WHERE ${clause}
    `;

    if (minRisk !== undefined) {
      params.push(minRisk);
      sql += ` AND current_risk >= $${params.length}`;
    }

    sql += ' ORDER BY current_risk DESC LIMIT 1000';

    const res = await query<RiskCellRecord>(sql, params);
    return res.rows;
  }

  /**
   * Retrieve static terrain features for a cell.
   */
  async findTerrainFeatures(cellId: string): Promise<TerrainFeaturesRecord | null> {
    const res = await query<TerrainFeaturesRecord>(
      `SELECT * FROM terrain_features WHERE cell_id = $1`,
      [cellId],
    );
    return res.rows[0] || null;
  }

  /**
   * Retrieve latest observation (rainfall / soil moisture) for a cell.
   */
  async findLatestObservation(cellId: string): Promise<LatestObservationRecord | null> {
    const res = await query<LatestObservationRecord>(
      `SELECT * FROM rainfall_observations 
       WHERE cell_id = $1 
       ORDER BY observed_at DESC 
       LIMIT 1`,
      [cellId],
    );
    return res.rows[0] || null;
  }
}

export const riskRepository = new RiskRepository();
