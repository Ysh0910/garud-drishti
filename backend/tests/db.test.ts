import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { checkDatabaseHealth } from '../src/db/client';

describe('Database Foundation & Migration Schema', () => {
  const migrationsDir = path.resolve(__dirname, '../src/db/migrations');

  it('contains migration files with valid SQL structure', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain('001_initial_schema.sql');
  });

  it('001_initial_schema.sql defines all required canonical entities and spatial indexes', () => {
    const schemaSql = fs.readFileSync(path.join(migrationsDir, '001_initial_schema.sql'), 'utf-8');

    // Required PostGIS extensions
    expect(schemaSql).toContain('CREATE EXTENSION IF NOT EXISTS postgis');
    expect(schemaSql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Core Tables from Phase 3 Contract
    const requiredTables = [
      'risk_cells',
      'historical_landslides',
      'terrain_features',
      'rainfall_observations',
      'citizen_reports',
      'report_media',
      'assets',
      'alerts',
      'model_versions',
      'prediction_logs',
      'users',
      'audit_logs',
    ];

    for (const table of requiredTables) {
      expect(schemaSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    // Spatial GIST indexes
    const requiredIndexes = [
      'idx_risk_cells_geom',
      'idx_historical_landslides_geom',
      'idx_citizen_reports_geom',
      'idx_assets_geom',
    ];

    for (const index of requiredIndexes) {
      expect(schemaSql).toContain(`INDEX IF NOT EXISTS ${index}`);
    }
  });

  it('checkDatabaseHealth returns structured status without unhandled exceptions', async () => {
    const health = await checkDatabaseHealth();
    expect(health).toBeDefined();
    expect(typeof health.connected).toBe('boolean');
    expect(typeof health.postgis_installed).toBe('boolean');
  });
});
