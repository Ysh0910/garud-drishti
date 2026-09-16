-- ============================================================================
-- GARUD DRISHTI — Migration 001: Initial PostGIS Schema
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Risk Cells (Spatial Grid)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_cells (
    cell_id VARCHAR(64) PRIMARY KEY,
    geometry GEOMETRY(Polygon, 4326) NOT NULL,
    base_susceptibility INTEGER CHECK (base_susceptibility BETWEEN 0 AND 100),
    current_risk INTEGER CHECK (current_risk BETWEEN 0 AND 100),
    risk_level VARCHAR(32) NOT NULL,
    risk_state VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    response_priority VARCHAR(32) NOT NULL DEFAULT 'LOW',
    trend VARCHAR(32) NOT NULL DEFAULT 'STABLE',
    confidence DOUBLE PRECISION CHECK (confidence IS NULL OR (confidence >= 0.0 AND confidence <= 1.0)),
    data_quality VARCHAR(32) NOT NULL DEFAULT 'GOOD',
    forecast_6h INTEGER CHECK (forecast_6h IS NULL OR (forecast_6h BETWEEN 0 AND 100)),
    forecast_24h INTEGER CHECK (forecast_24h IS NULL OR (forecast_24h BETWEEN 0 AND 100)),
    forecast_48h INTEGER CHECK (forecast_48h IS NULL OR (forecast_48h BETWEEN 0 AND 100)),
    forecast_72h INTEGER CHECK (forecast_72h IS NULL OR (forecast_72h BETWEEN 0 AND 100)),
    model_version VARCHAR(64),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_cells_geom ON risk_cells USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_risk_cells_risk_level ON risk_cells (risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_cells_risk_state ON risk_cells (risk_state);
CREATE INDEX IF NOT EXISTS idx_risk_cells_updated_at ON risk_cells (updated_at);

-- ----------------------------------------------------------------------------
-- 2. Historical Landslides (GSI / ISRO inventory)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historical_landslides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(128),
    location GEOMETRY(Point, 4326) NOT NULL,
    state VARCHAR(64),
    district VARCHAR(64),
    event_date DATE,
    source VARCHAR(64) NOT NULL DEFAULT 'GSI',
    confidence VARCHAR(32),
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historical_landslides_geom ON historical_landslides USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_historical_landslides_event_date ON historical_landslides (event_date);

-- ----------------------------------------------------------------------------
-- 3. Terrain Features (Static Model 1 inputs per cell)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS terrain_features (
    cell_id VARCHAR(64) PRIMARY KEY REFERENCES risk_cells (cell_id) ON DELETE CASCADE,
    elevation_m DOUBLE PRECISION,
    slope_deg DOUBLE PRECISION,
    aspect_deg DOUBLE PRECISION,
    curvature DOUBLE PRECISION,
    landcover VARCHAR(64),
    geology VARCHAR(64),
    geomorphology VARCHAR(64),
    hydrological_condition VARCHAR(64),
    distance_to_drainage_m DOUBLE PRECISION,
    historical_ls_density DOUBLE PRECISION,
    distance_to_historical_ls_m DOUBLE PRECISION,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Rainfall Observations (Rolling dynamic observations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rainfall_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id VARCHAR(64) REFERENCES risk_cells (cell_id) ON DELETE CASCADE,
    rainfall_1h_mm DOUBLE PRECISION,
    rainfall_3h_mm DOUBLE PRECISION,
    rainfall_6h_mm DOUBLE PRECISION,
    rainfall_12h_mm DOUBLE PRECISION,
    rainfall_24h_mm DOUBLE PRECISION,
    rainfall_72h_mm DOUBLE PRECISION,
    rainfall_7d_mm DOUBLE PRECISION,
    soil_moisture DOUBLE PRECISION,
    source VARCHAR(64),
    observed_at TIMESTAMPTZ NOT NULL,
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    quality VARCHAR(32) NOT NULL DEFAULT 'GOOD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rainfall_obs_cell_observed ON rainfall_observations (cell_id, observed_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Citizen Reports (Field hazard evidence)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizen_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_report_id UUID UNIQUE NOT NULL,
    category VARCHAR(32) NOT NULL,
    description VARCHAR(1000),
    location GEOMETRY(Point, 4326) NOT NULL,
    location_accuracy_m DOUBLE PRECISION,
    captured_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity VARCHAR(32),
    media_url TEXT,
    evidence_score DOUBLE PRECISION CHECK (evidence_score IS NULL OR (evidence_score >= 0.0 AND evidence_score <= 1.0)),
    nearest_cell_id VARCHAR(64) REFERENCES risk_cells (cell_id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    verified_by VARCHAR(128),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_citizen_reports_geom ON citizen_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_status ON citizen_reports (status);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_submitted_at ON citizen_reports (submitted_at DESC);

-- ----------------------------------------------------------------------------
-- 6. Report Media
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES citizen_reports (report_id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_media_report_id ON report_media (report_id);

-- ----------------------------------------------------------------------------
-- 7. Assets & Infrastructure Exposure
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assets (
    asset_id VARCHAR(64) PRIMARY KEY,
    asset_type VARCHAR(32) NOT NULL,
    name VARCHAR(255),
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    road_class VARCHAR(32),
    population INTEGER,
    nearest_cell_id VARCHAR(64) REFERENCES risk_cells (cell_id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_geom ON assets USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (asset_type);

-- ----------------------------------------------------------------------------
-- 8. Alerts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id VARCHAR(64) REFERENCES risk_cells (cell_id) ON DELETE SET NULL,
    zone_name VARCHAR(255),
    severity VARCHAR(32) NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    trigger_reason TEXT NOT NULL,
    trigger_rule VARCHAR(64) NOT NULL,
    risk_score_at_creation INTEGER CHECK (risk_score_at_creation BETWEEN 0 AND 100),
    risk_score_current INTEGER CHECK (risk_score_current IS NULL OR (risk_score_current BETWEEN 0 AND 100)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by VARCHAR(128),
    approved_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notification_channel VARCHAR(32) DEFAULT 'SIMULATED',
    notification_delivery_status VARCHAR(32) DEFAULT 'PENDING',
    notification_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_cell_id ON alerts (cell_id);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts (state);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Model Versions & Metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_versions (
    model_id VARCHAR(64) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    dataset_version VARCHAR(64) NOT NULL,
    feature_schema_version VARCHAR(64) NOT NULL,
    training_timestamp TIMESTAMPTZ NOT NULL,
    validation_method VARCHAR(128) NOT NULL,
    metrics JSONB NOT NULL,
    thresholds JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (model_id, model_version)
);

-- ----------------------------------------------------------------------------
-- 10. Prediction Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_logs (
    prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    cell_id VARCHAR(64) REFERENCES risk_cells (cell_id) ON DELETE SET NULL,
    model_version VARCHAR(64) NOT NULL,
    base_susceptibility INTEGER,
    current_risk INTEGER,
    data_quality VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_logs_created_at ON prediction_logs (created_at DESC);

-- ----------------------------------------------------------------------------
-- 11. Users & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'VIEW_ONLY',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_entity VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
