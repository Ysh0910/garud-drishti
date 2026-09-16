import { transaction, closeDatabasePool, checkDatabaseHealth } from './client';

// ============================================================================
// Database Seed Script for Development / Testing
// Populates canonical mock risk cells and assets matching contracts examples
// ============================================================================

export async function seedDatabase(): Promise<void> {
  await transaction(async (client) => {
    // 1. Insert seed risk cells
    await client.query(`
      INSERT INTO risk_cells (
        cell_id, geometry, base_susceptibility, current_risk, risk_level, risk_state,
        response_priority, trend, confidence, data_quality, forecast_6h, forecast_24h,
        forecast_48h, forecast_72h, model_version, updated_at
      ) VALUES 
      (
        'CELL_NER_001',
        ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[88.60,27.32],[88.62,27.32],[88.62,27.34],[88.60,27.34],[88.60,27.32]]]}'),
        65, 88, 'CRITICAL', 'CRITICAL', 'IMMEDIATE', 'INCREASING', 0.89, 'GOOD', 85, 92, 78, 65,
        'dynamic_xgb_v1', NOW()
      ),
      (
        'CELL_NER_002',
        ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[88.62,27.32],[88.64,27.32],[88.64,27.34],[88.62,27.34],[88.62,27.32]]]}'),
        45, 68, 'HIGH', 'HIGH', 'HIGH', 'INCREASING', 0.82, 'GOOD', 72, 75, 60, 50,
        'dynamic_xgb_v1', NOW()
      ),
      (
        'CELL_NER_003',
        ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[88.58,27.30],[88.60,27.30],[88.60,27.32],[88.58,27.32],[88.58,27.30]]]}'),
        30, 42, 'MODERATE', 'WATCH', 'MEDIUM', 'STABLE', 0.75, 'GOOD', 45, 50, 40, 35,
        'dynamic_xgb_v1', NOW()
      ),
      (
        'CELL_NER_004',
        ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[88.64,27.30],[88.66,27.30],[88.66,27.32],[88.64,27.32],[88.64,27.30]]]}'),
        15, 18, 'VERY_LOW', 'NORMAL', 'LOW', 'STABLE', NULL, 'GOOD', 20, 22, 18, 15,
        'dynamic_xgb_v1', NOW()
      )
      ON CONFLICT (cell_id) DO UPDATE SET
        current_risk = EXCLUDED.current_risk,
        risk_level = EXCLUDED.risk_level,
        risk_state = EXCLUDED.risk_state,
        response_priority = EXCLUDED.response_priority,
        updated_at = EXCLUDED.updated_at;
    `);

    // 2. Insert seed terrain features for CELL_NER_001
    await client.query(`
      INSERT INTO terrain_features (
        cell_id, elevation_m, slope_deg, aspect_deg, curvature, landcover, geology,
        geomorphology, hydrological_condition, distance_to_drainage_m, historical_ls_density,
        distance_to_historical_ls_m, updated_at
      ) VALUES (
        'CELL_NER_001', 1450.0, 34.5, 142.0, 0.045, 'forest_degraded', 'gneiss_schist',
        'steep_structural_slope', 'high_pore_pressure', 120.0, 3.4, 250.0, NOW()
      )
      ON CONFLICT (cell_id) DO NOTHING;
    `);

    // 3. Insert seed assets (Roads & Villages)
    await client.query(`
      INSERT INTO assets (asset_id, asset_type, name, geometry, road_class, population, nearest_cell_id, updated_at)
      VALUES 
      (
        'ROAD_NH10_SEG_01', 'ROAD', 'NH-10 Gangtok Highway',
        ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[88.60,27.32],[88.61,27.33],[88.62,27.34]]}'),
        'NH', NULL, 'CELL_NER_001', NOW()
      ),
      (
        'VIL_GANGTOK_RURAL_01', 'VILLAGE', 'Tathangchen Settlement',
        ST_GeomFromGeoJSON('{"type":"Point","coordinates":[88.615,27.332]}'),
        NULL, 1250, 'CELL_NER_001', NOW()
      ),
      (
        'HOSP_DISTRICT_01', 'HOSPITAL', 'Sir Thutob Namgyal Memorial Hospital',
        ST_GeomFromGeoJSON('{"type":"Point","coordinates":[88.612,27.328]}'),
        NULL, NULL, 'CELL_NER_001', NOW()
      )
      ON CONFLICT (asset_id) DO NOTHING;
    `);

    // 4. Insert seed candidate alert
    await client.query(`
      INSERT INTO alerts (
        alert_id, cell_id, zone_name, severity, state, trigger_reason, trigger_rule,
        risk_score_at_creation, risk_score_current, notification_channel, notification_delivery_status
      ) VALUES (
        'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        'CELL_NER_001',
        'Gangtok North Slope (NH-10 corridor)',
        'CRITICAL',
        'PENDING_APPROVAL',
        'Severe rainfall accumulation (142mm/24h) and high base susceptibility exceed critical threshold.',
        'RULE_1_CRITICAL',
        88,
        88,
        'SIMULATED',
        'PENDING'
      )
      ON CONFLICT (alert_id) DO NOTHING;
    `);
  });
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  (async () => {
    try {
      console.log('[db:seed] Checking database connection...');
      const health = await checkDatabaseHealth();
      if (!health.connected) {
        console.error('[db:seed] Database connection failed:', health.error);
        process.exit(1);
      }

      console.log('[db:seed] Seeding database...');
      await seedDatabase();
      console.log('[db:seed] Database seeding completed successfully.');
      await closeDatabasePool();
      process.exit(0);
    } catch (err) {
      console.error('[db:seed] Seeding failed:', err);
      await closeDatabasePool();
      process.exit(1);
    }
  })();
}
