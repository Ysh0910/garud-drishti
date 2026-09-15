import { describe, it, expect } from '@jest/globals';
import {
  sqlAsGeoJson,
  sqlBboxIntersects,
  sqlPointContains,
  sqlDistanceWithin,
  riskRepository,
  reportRepository,
  assetRepository,
  alertRepository,
  dashboardRepository,
} from '../src/repositories';

describe('Geospatial Query Helpers', () => {
  it('sqlAsGeoJson creates valid PostGIS JSON conversion clause', () => {
    const clause = sqlAsGeoJson('geometry', 'geom_out');
    expect(clause).toBe('ST_AsGeoJSON(geometry)::json AS geom_out');
  });

  it('sqlBboxIntersects builds envelope intersection with 4 sequential params', () => {
    const { clause, nextIndex } = sqlBboxIntersects(1, 'location');
    expect(clause).toContain('ST_Intersects(location, ST_MakeEnvelope($1, $2, $3, $4, 4326))');
    expect(nextIndex).toBe(5);
  });

  it('sqlPointContains builds point containment clause', () => {
    const { clause, nextIndex } = sqlPointContains(3, 'boundary');
    expect(clause).toContain('ST_Contains(boundary, ST_SetSRID(ST_Point($3, $4), 4326))');
    expect(nextIndex).toBe(5);
  });

  it('sqlDistanceWithin builds geodesic radius search and distance calculation', () => {
    const { clause, distanceSelect, nextIndex } = sqlDistanceWithin(1, 'geom');
    expect(clause).toContain('ST_DWithin(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, $3)');
    expect(distanceSelect).toContain('ST_Distance(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) AS distance_m');
    expect(nextIndex).toBe(4);
  });
});

describe('Repository Layer Instances & Method Signatures', () => {
  it('riskRepository exposes canonical query methods', () => {
    expect(typeof riskRepository.findById).toBe('function');
    expect(typeof riskRepository.findByPoint).toBe('function');
    expect(typeof riskRepository.findInBbox).toBe('function');
    expect(typeof riskRepository.findTerrainFeatures).toBe('function');
    expect(typeof riskRepository.findLatestObservation).toBe('function');
  });

  it('reportRepository exposes canonical report methods', () => {
    expect(typeof reportRepository.createReport).toBe('function');
    expect(typeof reportRepository.findById).toBe('function');
    expect(typeof reportRepository.findReports).toBe('function');
    expect(typeof reportRepository.updateStatus).toBe('function');
  });

  it('assetRepository exposes canonical asset & exposure methods', () => {
    expect(typeof assetRepository.findNearbyAssets).toBe('function');
    expect(typeof assetRepository.findRoadsWithRisk).toBe('function');
    expect(typeof assetRepository.findVillagesWithRisk).toBe('function');
    expect(typeof assetRepository.getExposureKpis).toBe('function');
  });

  it('alertRepository exposes canonical alert methods', () => {
    expect(typeof alertRepository.createAlert).toBe('function');
    expect(typeof alertRepository.findById).toBe('function');
    expect(typeof alertRepository.findAlerts).toBe('function');
    expect(typeof alertRepository.findActiveAlertForCell).toBe('function');
    expect(typeof alertRepository.acknowledgeAlert).toBe('function');
    expect(typeof alertRepository.resolveAlert).toBe('function');
  });

  it('dashboardRepository exposes canonical KPI aggregation methods', () => {
    expect(typeof dashboardRepository.getDashboardSummary).toBe('function');
  });
});
