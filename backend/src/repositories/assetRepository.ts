import { query } from '../db/client';
import { sqlAsGeoJson, sqlBboxIntersects, BoundingBox } from './geo';
import { AssetType, RiskLevel, Trend, GeoJsonGeometry, GeoJsonLineString } from '../types';

export interface NearbyAssetRecord {
  asset_id: string;
  asset_type: AssetType;
  name: string | null;
  distance_m: number;
  geometry: GeoJsonGeometry;
  risk_score: number | null;
  risk_level: RiskLevel | null;
}

export interface RoadRiskRecord {
  road_id: string;
  name: string | null;
  road_class: string | null;
  geometry: GeoJsonLineString;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  risk_trend: Trend | null;
  nearby_reports: number;
  updated_at: Date;
}

export interface VillageRiskRecord {
  village_id: string;
  name: string;
  latitude: number;
  longitude: number;
  population: number | null;
  current_risk: number | null;
  risk_level: RiskLevel | null;
  risk_24h: number | null;
  nearest_cell_id: string | null;
  road_access_risk: RiskLevel | null;
  updated_at: Date;
}

export class AssetRepository {
  /**
   * Find assets within a radius (meters) around a query point.
   */
  async findNearbyAssets(
    lat: number,
    lon: number,
    radiusM: number,
    assetType?: AssetType,
  ): Promise<NearbyAssetRecord[]> {
    const params: unknown[] = [lon, lat, radiusM];
    let typeFilter = '';

    if (assetType) {
      params.push(assetType);
      typeFilter = `AND a.asset_type = $${params.length}`;
    }

    const res = await query<NearbyAssetRecord>(
      `SELECT 
        a.asset_id,
        a.asset_type,
        a.name,
        ST_Distance(a.geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) AS distance_m,
        ${sqlAsGeoJson('a.geometry', 'geometry')},
        rc.current_risk AS risk_score,
        rc.risk_level
      FROM assets a
      LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id
      WHERE ST_DWithin(a.geometry::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, $3)
      ${typeFilter}
      ORDER BY distance_m ASC
      LIMIT 100`,
      params,
    );

    return res.rows;
  }

  /**
   * Query road segments with intersecting risk context.
   */
  async findRoadsWithRisk(bbox?: BoundingBox, minRisk?: number): Promise<RoadRiskRecord[]> {
    const params: unknown[] = [];
    const conditions: string[] = ["a.asset_type = 'ROAD'"];

    if (bbox) {
      const startIndex = params.length + 1;
      params.push(bbox.west, bbox.south, bbox.east, bbox.north);
      const { clause } = sqlBboxIntersects(startIndex, 'a.geometry');
      conditions.push(clause);
    }

    if (minRisk !== undefined) {
      params.push(minRisk);
      conditions.push(`rc.current_risk >= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const res = await query<RoadRiskRecord>(
      `SELECT 
        a.asset_id AS road_id,
        a.name,
        a.road_class,
        ${sqlAsGeoJson('a.geometry', 'geometry')},
        rc.current_risk AS risk_score,
        rc.risk_level,
        rc.trend AS risk_trend,
        COALESCE((
          SELECT COUNT(*) 
          FROM citizen_reports cr 
          WHERE ST_DWithin(cr.location::geography, a.geometry::geography, 1000)
            AND cr.status IN ('VERIFIED', 'PROBABLE')
        ), 0)::integer AS nearby_reports,
        a.updated_at
      FROM assets a
      LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id
      ${whereClause}
      ORDER BY rc.current_risk DESC NULLS LAST
      LIMIT 200`,
      params,
    );

    return res.rows;
  }

  /**
   * Query villages with risk and exposure context.
   */
  async findVillagesWithRisk(bbox?: BoundingBox, minRisk?: number): Promise<VillageRiskRecord[]> {
    const params: unknown[] = [];
    const conditions: string[] = ["a.asset_type = 'VILLAGE'"];

    if (bbox) {
      const startIndex = params.length + 1;
      params.push(bbox.west, bbox.south, bbox.east, bbox.north);
      const { clause } = sqlBboxIntersects(startIndex, 'a.geometry');
      conditions.push(clause);
    }

    if (minRisk !== undefined) {
      params.push(minRisk);
      conditions.push(`rc.current_risk >= $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const res = await query<VillageRiskRecord>(
      `SELECT 
        a.asset_id AS village_id,
        a.name,
        ST_Y(a.geometry::geometry) AS latitude,
        ST_X(a.geometry::geometry) AS longitude,
        a.population,
        rc.current_risk,
        rc.risk_level,
        rc.forecast_24h AS risk_24h,
        a.nearest_cell_id,
        rc.risk_level AS road_access_risk,
        a.updated_at
      FROM assets a
      LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id
      ${whereClause}
      ORDER BY rc.current_risk DESC NULLS LAST
      LIMIT 200`,
      params,
    );

    return res.rows;
  }

  /**
   * Calculate aggregated exposure metrics for the KPI summary row.
   */
  async getExposureKpis(): Promise<{
    roads_at_risk: number;
    villages_at_risk: number;
    critical_assets: number;
  }> {
    const res = await query<{
      roads_at_risk: string;
      villages_at_risk: string;
      critical_assets: string;
    }>(`
      SELECT 
        COUNT(DISTINCT CASE WHEN a.asset_type = 'ROAD' AND rc.current_risk >= 61 THEN a.asset_id END) AS roads_at_risk,
        COUNT(DISTINCT CASE WHEN a.asset_type = 'VILLAGE' AND rc.current_risk >= 61 THEN a.asset_id END) AS villages_at_risk,
        COUNT(DISTINCT CASE WHEN a.asset_type NOT IN ('ROAD', 'VILLAGE') AND rc.current_risk >= 81 THEN a.asset_id END) AS critical_assets
      FROM assets a
      LEFT JOIN risk_cells rc ON a.nearest_cell_id = rc.cell_id
    `);

    const row = res.rows[0];
    return {
      roads_at_risk: parseInt(row?.roads_at_risk || '0', 10),
      villages_at_risk: parseInt(row?.villages_at_risk || '0', 10),
      critical_assets: parseInt(row?.critical_assets || '0', 10),
    };
  }
}

export const assetRepository = new AssetRepository();
