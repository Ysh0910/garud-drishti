import {
  assetRepository,
  RoadRiskRecord,
  VillageRiskRecord,
} from '../repositories/assetRepository';
import {
  AssetType,
  RiskLevel,
  GeoJsonGeometry,
  GeoJsonLineString,
  GeoJsonFeatureCollection,
} from '../types';

import { BoundingBox } from '../repositories/geo';
import {
  MOCK_EXPOSURE_ASSETS,
  calculateHaversineDistanceM,
} from '../adapters/mockExposureData';

export interface AssetSummary {
  asset_id: string;
  asset_type: AssetType;
  name: string | null;
  distance_m: number;
  geometry: GeoJsonGeometry;
  risk_score: number | null;
  risk_level: RiskLevel | null;
}

export interface NearbyAssetsResponse {
  query_latitude: number;
  query_longitude: number;
  radius_m: number;
  assets: AssetSummary[];
}

export interface VillageRiskItem {
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
  updated_at: string;
}

export interface VillageRiskResponse {
  villages: VillageRiskItem[];
}

export class ExposureService {
  /**
   * Find nearby infrastructure & settlement assets within radius of query point.
   */
  async getNearbyAssets(
    latitude: number,
    longitude: number,
    radiusM = 5000,
    assetType?: AssetType,
  ): Promise<NearbyAssetsResponse> {
    try {
      const records = await assetRepository.findNearbyAssets(
        latitude,
        longitude,
        radiusM,
        assetType,
      );

      if (records && records.length > 0) {
        return {
          query_latitude: latitude,
          query_longitude: longitude,
          radius_m: radiusM,
          assets: records.map((r) => ({
            asset_id: r.asset_id,
            asset_type: r.asset_type,
            name: r.name,
            distance_m: Math.round(r.distance_m * 10) / 10,
            geometry: r.geometry,
            risk_score: r.risk_score,
            risk_level: r.risk_level,
          })),
        };
      }
    } catch (err) {
      console.warn('[exposureService] Database findNearbyAssets failed, using mock data:', err);
    }

    // Mock fallback with geometric Haversine distance computation
    let candidates = MOCK_EXPOSURE_ASSETS;
    if (assetType) {
      candidates = candidates.filter((a) => a.asset_type === assetType);
    }

    const calculated: AssetSummary[] = [];

    for (const asset of candidates) {
      let assetLat = latitude;
      let assetLon = longitude;

      if (asset.geometry.type === 'Point') {
        const [lon, lat] = asset.geometry.coordinates as [number, number];
        assetLat = lat;
        assetLon = lon;
      } else if (asset.geometry.type === 'LineString') {
        // Use midpoint of LineString
        const coords = asset.geometry.coordinates as [number, number][];
        const midIndex = Math.floor(coords.length / 2);
        const [lon, lat] = coords[midIndex];
        assetLat = lat;
        assetLon = lon;
      }

      const distM = calculateHaversineDistanceM(latitude, longitude, assetLat, assetLon);
      if (distM <= radiusM) {
        calculated.push({
          asset_id: asset.asset_id,
          asset_type: asset.asset_type,
          name: asset.name,
          distance_m: Math.round(distM * 10) / 10,
          geometry: asset.geometry,
          risk_score: asset.risk_score,
          risk_level: asset.risk_level,
        });
      }
    }

    calculated.sort((a, b) => a.distance_m - b.distance_m);

    return {
      query_latitude: latitude,
      query_longitude: longitude,
      radius_m: radiusM,
      assets: calculated,
    };
  }

  /**
   * Query road segments with intersecting risk context as a GeoJSON FeatureCollection.
   */
  async getRoadsWithRisk(
    bbox?: BoundingBox,
    minRisk?: number,
  ): Promise<GeoJsonFeatureCollection<GeoJsonLineString>> {
    let records: RoadRiskRecord[] = [];

    try {
      records = await assetRepository.findRoadsWithRisk(bbox, minRisk);
    } catch (err) {
      console.warn('[exposureService] Database findRoadsWithRisk failed, using mock data:', err);
    }

    if (records.length === 0) {
      let mockRoads = MOCK_EXPOSURE_ASSETS.filter((a) => a.asset_type === 'ROAD');

      if (minRisk !== undefined) {
        mockRoads = mockRoads.filter((r) => r.risk_score >= minRisk);
      }

      if (bbox) {
        mockRoads = mockRoads.filter((r) => {
          const coords = r.geometry.coordinates as [number, number][];
          const lons = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);

          const noOverlap =
            maxLon < bbox.west ||
            minLon > bbox.east ||
            maxLat < bbox.south ||
            minLat > bbox.north;

          return !noOverlap;
        });
      }

      return {
        type: 'FeatureCollection',
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
        },
        meta: {
          total_roads: mockRoads.length,
          generated_at: new Date().toISOString(),
        },
        features: mockRoads.map((r) => ({
          type: 'Feature',
          geometry: r.geometry as GeoJsonLineString,
          properties: {
            road_id: r.asset_id,
            name: r.name,
            road_class: r.road_class || 'NH',
            risk_score: r.risk_score,
            risk_level: r.risk_level,
            risk_trend: r.risk_trend || 'STABLE',
            nearby_reports: r.nearby_reports || 0,
            updated_at: r.updated_at,
          },
        })),
      };
    }

    return {
      type: 'FeatureCollection',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
      },
      meta: {
        total_roads: records.length,
        generated_at: new Date().toISOString(),
      },
      features: records.map((r) => ({
        type: 'Feature',
        geometry: r.geometry,
        properties: {
          road_id: r.road_id,
          name: r.name,
          road_class: r.road_class,
          risk_score: r.risk_score,
          risk_level: r.risk_level,
          risk_trend: r.risk_trend,
          nearby_reports: r.nearby_reports,
          updated_at: r.updated_at.toISOString(),
        },
      })),
    };
  }

  /**
   * Query villages with risk and exposure context.
   */
  async getVillagesWithRisk(
    bbox?: BoundingBox,
    minRisk?: number,
  ): Promise<VillageRiskResponse> {
    let records: VillageRiskRecord[] = [];

    try {
      records = await assetRepository.findVillagesWithRisk(bbox, minRisk);
    } catch (err) {
      console.warn('[exposureService] Database findVillagesWithRisk failed, using mock data:', err);
    }

    if (records.length === 0) {
      let mockVillages = MOCK_EXPOSURE_ASSETS.filter((a) => a.asset_type === 'VILLAGE');

      if (minRisk !== undefined) {
        mockVillages = mockVillages.filter((v) => v.risk_score >= minRisk);
      }

      if (bbox) {
        mockVillages = mockVillages.filter((v) => {
          const [lon, lat] = v.geometry.coordinates as [number, number];
          return (
            lon >= bbox.west &&
            lon <= bbox.east &&
            lat >= bbox.south &&
            lat <= bbox.north
          );
        });
      }

      return {
        villages: mockVillages.map((v) => {
          const [lon, lat] = v.geometry.coordinates as [number, number];
          return {
            village_id: v.asset_id,
            name: v.name,
            latitude: lat,
            longitude: lon,
            population: v.population ?? null,
            current_risk: v.risk_score,
            risk_level: v.risk_level,
            risk_24h: v.risk_24h ?? null,
            nearest_cell_id: v.nearest_cell_id,
            road_access_risk: v.road_access_risk ?? null,
            updated_at: v.updated_at,
          };
        }),
      };
    }

    return {
      villages: records.map((r) => ({
        village_id: r.village_id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        population: r.population,
        current_risk: r.current_risk,
        risk_level: r.risk_level,
        risk_24h: r.risk_24h,
        nearest_cell_id: r.nearest_cell_id,
        road_access_risk: r.road_access_risk,
        updated_at: r.updated_at.toISOString(),
      })),
    };
  }
}

export const exposureService = new ExposureService();
