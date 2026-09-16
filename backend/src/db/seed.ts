import { transaction, closeDatabasePool, checkDatabaseHealth } from './client';
import { syncRiskGridToPostgres } from './sync_grid';

// ============================================================================
// Database Seed Script for Development / Hackathon Demo
// Populates canonical mock risk cells, assets, citizen reports, and alerts
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

    // 2. Insert seed terrain features
    await client.query(`
      INSERT INTO terrain_features (
        cell_id, elevation_m, slope_deg, aspect_deg, curvature, landcover, geology,
        geomorphology, hydrological_condition, distance_to_drainage_m, historical_ls_density,
        distance_to_historical_ls_m, updated_at
      ) VALUES 
      (
        'CELL_NER_001', 1450.0, 34.5, 142.0, 0.045, 'forest_degraded', 'gneiss_schist',
        'steep_structural_slope', 'high_pore_pressure', 120.0, 3.4, 250.0, NOW()
      ),
      (
        'CELL_NER_002', 1280.0, 29.0, 135.0, 0.030, 'vegetation', 'phyllite',
        'denudational_slope', 'moderate_pore_pressure', 220.0, 2.1, 450.0, NOW()
      )
      ON CONFLICT (cell_id) DO NOTHING;
    `);

    // 3. Insert seed assets (Roads, Villages, Hospitals)
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
      ),
      (
        'ROAD_NH106_ML_01', 'ROAD', 'NH-106 Shillong-Nongstoin Corridor',
        ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[91.55,25.30],[91.60,25.35],[91.70,25.40]]}'),
        'NH', NULL, 'NER_CELL_2525_9150', NOW()
      ),
      (
        'VIL_MAWKTYRSHAT_01', 'VILLAGE', 'Mawktyrshat Village',
        ST_GeomFromGeoJSON('{"type":"Point","coordinates":[91.62,25.34]}'),
        NULL, 890, 'NER_CELL_2525_9150', NOW()
      ),
      (
        'ROAD_NH54_MZ_01', 'ROAD', 'NH-54 Aizawl-Lunglei Highway',
        ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[92.70,23.70],[92.75,23.75],[92.80,23.80]]}'),
        'NH', NULL, 'NER_CELL_2375_9275', NOW()
      )
      ON CONFLICT (asset_id) DO NOTHING;
    `);

    // 4. Insert seed candidate alerts
    await client.query(`
      INSERT INTO alerts (
        alert_id, cell_id, zone_name, severity, state, trigger_reason, trigger_rule,
        risk_score_at_creation, risk_score_current, notification_channel, notification_delivery_status
      ) VALUES 
      (
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
      ),
      (
        'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
        'NER_CELL_2525_9150',
        'Cherrapunji-Mawkdok Escarpment',
        'HIGH',
        'ACTIVE',
        'Sustained monsoonal downpour (190mm/72h) triggering active pore-pressure escalation.',
        'RULE_2_HIGH',
        78,
        78,
        'SIMULATED',
        'DELIVERED'
      )
      ON CONFLICT (alert_id) DO NOTHING;
    `);

    // 5. Insert initial seed citizen reports
    await client.query(`
      INSERT INTO citizen_reports (
        report_id, client_report_id, category, description, location, location_accuracy_m,
        captured_at, submitted_at, severity, status, verified_by, verified_at, media_url
      ) VALUES 
      (
        'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
        'f1e2d3c4-b5a6-9788-1122-334455667788',
        'CRACK',
        'Deep lateral tension crack (approx 15cm width) observed across upper shoulder of NH-10.',
        ST_SetSRID(ST_Point(88.608, 27.331), 4326),
        4.5,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours',
        'HIGH',
        'PENDING',
        NULL,
        NULL,
        '/uploads/sample_crack.jpg'
      ),
      (
        'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
        'a2b3c4d5-e6f7-8899-0011-223344556677',
        'ROCKFALL',
        'Minor debris and boulders detached from cliff face near Mawkdok bridge.',
        ST_SetSRID(ST_Point(91.58, 25.32), 4326),
        6.0,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '4 hours',
        'MEDIUM',
        'VERIFIED',
        'R. Baruah (MSDMA)',
        NOW() - INTERVAL '1 hour',
        '/uploads/sample_rockfall.jpg'
      )
      ON CONFLICT (client_report_id) DO NOTHING;
    `);
  });

  // 6. Sync latest regional ML grid cells
  try {
    await syncRiskGridToPostgres();
  } catch (err) {
    console.warn('[db:seed] Regional ML grid sync failed, proceeding with core seed:', err);
  }
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
