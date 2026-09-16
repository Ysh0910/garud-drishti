import fs from 'fs';
import path from 'path';
import { query, closeDatabasePool } from './client';
import { scoreToRiskLevel, scoreToRiskState } from '../services/riskService';

const GEOJSON_PATH = path.resolve(__dirname, '../../../data/processed/risk_grid_latest.geojson');

export async function syncRiskGridToPostgres(): Promise<number> {
  if (!fs.existsSync(GEOJSON_PATH)) {
    console.warn(`[sync_grid] GeoJSON file not found at ${GEOJSON_PATH}`);
    return 0;
  }

  const rawData = fs.readFileSync(GEOJSON_PATH, 'utf-8');
  const geojson = JSON.parse(rawData);

  if (!geojson.features || !Array.isArray(geojson.features)) {
    console.warn('[sync_grid] Invalid GeoJSON structure');
    return 0;
  }

  let count = 0;
  for (const feat of geojson.features) {
    const props = feat.properties || {};
    const geomStr = JSON.stringify(feat.geometry);
    const cellId = props.cell_id || `CELL_${props.latitude}_${props.longitude}`;
    const baseSusc = Math.round(props.base_susceptibility ?? 50);
    const currentRisk = Math.round(props.current_risk ?? 0);
    const riskLevel = props.risk_level || scoreToRiskLevel(currentRisk);
    const riskState = scoreToRiskState(currentRisk);
    const responsePriority = currentRisk >= 80 ? 'IMMEDIATE' : currentRisk >= 60 ? 'HIGH' : currentRisk >= 40 ? 'MEDIUM' : 'LOW';
    const trend = props.trend || 'STABLE';
    const confidence = props.confidence ?? (props.data_quality === 'GOOD' ? 0.85 : 0.70);
    const dataQuality = props.data_quality || 'GOOD';
    const f6h = props.risk_6h !== undefined ? Math.round(props.risk_6h) : null;
    const f24h = props.risk_24h !== undefined ? Math.round(props.risk_24h) : null;
    const f48h = props.risk_48h !== undefined ? Math.round(props.risk_48h) : null;
    const f72h = props.risk_72h !== undefined ? Math.round(props.risk_72h) : null;
    const modelVersion = props.model_version || 'dynamic_risk_xgboost_v1:v1.0';

    await query(
      `INSERT INTO risk_cells (
        cell_id, geometry, base_susceptibility, current_risk, risk_level, risk_state,
        response_priority, trend, confidence, data_quality, forecast_6h, forecast_24h,
        forecast_48h, forecast_72h, model_version, updated_at
      ) VALUES (
        $1, ST_GeomFromGeoJSON($2), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      ON CONFLICT (cell_id) DO UPDATE SET
        geometry = EXCLUDED.geometry,
        base_susceptibility = EXCLUDED.base_susceptibility,
        current_risk = EXCLUDED.current_risk,
        risk_level = EXCLUDED.risk_level,
        risk_state = EXCLUDED.risk_state,
        response_priority = EXCLUDED.response_priority,
        trend = EXCLUDED.trend,
        confidence = EXCLUDED.confidence,
        data_quality = EXCLUDED.data_quality,
        forecast_6h = EXCLUDED.forecast_6h,
        forecast_24h = EXCLUDED.forecast_24h,
        forecast_48h = EXCLUDED.forecast_48h,
        forecast_72h = EXCLUDED.forecast_72h,
        model_version = EXCLUDED.model_version,
        updated_at = EXCLUDED.updated_at`,
      [
        cellId,
        geomStr,
        baseSusc,
        currentRisk,
        riskLevel,
        riskState,
        responsePriority,
        trend,
        confidence,
        dataQuality,
        f6h,
        f24h,
        f48h,
        f72h,
        modelVersion,
      ],
    );

    // Upsert terrain features
    await query(
      `INSERT INTO terrain_features (
        cell_id, elevation_m, slope_deg, updated_at
      ) VALUES ($1, $2, $3, NOW())
      ON CONFLICT (cell_id) DO UPDATE SET
        elevation_m = EXCLUDED.elevation_m,
        slope_deg = EXCLUDED.slope_deg,
        updated_at = EXCLUDED.updated_at`,
      [cellId, props.elevation_m ?? null, props.slope_deg ?? null],
    );

    // Upsert latest observation
    if (props.rainfall_24h_mm !== undefined || props.soil_moisture !== undefined) {
      await query(
        `INSERT INTO rainfall_observations (
          cell_id, rainfall_24h_mm, rainfall_72h_mm, soil_moisture, source, observed_at, stale, quality
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)`,
        [
          cellId,
          props.rainfall_24h_mm ?? null,
          props.rainfall_72h_mm ?? null,
          props.soil_moisture ?? null,
          'IMD/GPM',
          false,
          dataQuality,
        ],
      );
    }

    count++;
  }

  console.log(`[sync_grid] Successfully synced ${count} risk cells into PostgreSQL/PostGIS`);
  return count;
}

// If executed directly:
if (require.main === module || process.argv[1]?.includes('sync_grid')) {
  syncRiskGridToPostgres()
    .then(() => closeDatabasePool())
    .catch((err) => {
      console.error('[sync_grid] Failed to sync grid:', err);
      process.exit(1);
    });
}
