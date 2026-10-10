-- ============================================================================
-- GARUD DRISHTI — Migration 002: Enable Row Level Security (RLS) on Public Schema
-- ============================================================================
-- Protects database tables from unauthorized access via Supabase PostgREST / anon API.
-- Backend Express services connecting via PostgreSQL connection pool (postgres role)
-- will continue to operate normally as database owner.

-- 1. Risk Cells & Spatial Grid
ALTER TABLE IF EXISTS risk_cells ENABLE ROW LEVEL SECURITY;

-- 2. Historical Landslide Inventory
ALTER TABLE IF EXISTS historical_landslides ENABLE ROW LEVEL SECURITY;

-- 3. Terrain Features
ALTER TABLE IF EXISTS terrain_features ENABLE ROW LEVEL SECURITY;

-- 4. Rainfall Observations
ALTER TABLE IF EXISTS rainfall_observations ENABLE ROW LEVEL SECURITY;

-- 5. Citizen Reports & Media
ALTER TABLE IF EXISTS citizen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS report_media ENABLE ROW LEVEL SECURITY;

-- 6. Assets & Infrastructure
ALTER TABLE IF EXISTS assets ENABLE ROW LEVEL SECURITY;

-- 7. Alerts
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;

-- 8. Models, Logs & Audit
ALTER TABLE IF EXISTS model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prediction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
