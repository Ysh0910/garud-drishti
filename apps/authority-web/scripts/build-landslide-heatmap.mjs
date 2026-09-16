#!/usr/bin/env node
/**
 * One-off data-prep script: merges the real GSI landslide inventory with the
 * matching positive samples from the susceptibility dataset into a single
 * GeoJSON the authority-web map can load directly as a heatmap source.
 *
 * Sources (read-only, never modified — data/raw stays immutable per AGENTS.md):
 *   - data/processed/spatial/landslide_inventory.geojson  (820 real GSI-sourced points)
 *   - data/final/susceptibility_dataset.csv                (terrain features; label=1 rows
 *     are the same 820 events, joined here by rounded lat/lon to attach slope_deg)
 *
 * Neither source records a landslide "intensity"/severity value. This script
 * DERIVES a heuristic `sim_intensity` (0.15-1.0) from real correlates (slope
 * steepness + a rough landslide-type severity ordering) plus a small
 * deterministic jitter for visual variety. This is a SIMULATED value, not a
 * measured one — every output feature is tagged `intensity_note` saying so,
 * and the UI must not present it as ground truth (AGENTS.md: never fabricate
 * data / label simulated values explicitly).
 *
 * Output: apps/authority-web/public/data/landslide_heatmap.geojson
 * Re-run this script (`node scripts/build-landslide-heatmap.mjs` from
 * apps/authority-web/) whenever the source datasets change.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const INVENTORY_PATH = path.join(REPO_ROOT, 'data/processed/spatial/landslide_inventory.geojson');
const SUSCEPTIBILITY_PATH = path.join(REPO_ROOT, 'data/final/susceptibility_dataset.csv');
const OUT_PATH = path.join(__dirname, '../public/data/landslide_heatmap.geojson');

// Rough real-world severity ordering by landslide type (approximate, not a validated
// scale — flows/topples tend to be faster/more destructive than shallow slides).
const TYPE_WEIGHT = {
  slide: 0.5,
  flow: 0.8,
  fall: 0.65,
  falls: 0.65,
  topple: 0.7,
  subsidence: 0.4,
  creep: 0.3,
};
const DEFAULT_TYPE_WEIGHT = 0.5;

function normalizeType(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'nil') return null;
  if (TYPE_WEIGHT[key] !== undefined) return key;
  return null; // garbled/free-text notes fall back to the default weight
}

// Deterministic pseudo-random jitter in [-amplitude, amplitude], seeded by id
// (so re-running the script produces identical output — no Math.random()).
function seededJitter(id, amplitude) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const unit = (hash % 10000) / 10000; // [0,1)
  return (unit * 2 - 1) * amplitude;
}

function readCsvRows(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function roundKey(lat, lon) {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, 'utf-8'));
const susceptibilityRows = readCsvRows(readFileSync(SUSCEPTIBILITY_PATH, 'utf-8'));

const positiveByCoord = new Map();
for (const row of susceptibilityRows) {
  if (row.label !== '1') continue; // never plot negative/control samples as landslide heat
  const lat = parseFloat(row.latitude);
  const lon = parseFloat(row.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  positiveByCoord.set(roundKey(lat, lon), row);
}

let matched = 0;
const features = inventory.features.map((f) => {
  const { landslide_id, source, state, district, landslide_type, confidence, date } = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const match = positiveByCoord.get(roundKey(lat, lon));
  if (match) matched++;

  const slopeDeg = match ? parseFloat(match.slope_deg) : NaN;
  const normalizedSlope = Number.isFinite(slopeDeg) ? Math.min(slopeDeg / 45, 1) : 0.3; // fallback if unjoined

  const typeKey = normalizeType(landslide_type);
  const typeWeight = typeKey ? TYPE_WEIGHT[typeKey] : DEFAULT_TYPE_WEIGHT;

  const jitter = seededJitter(landslide_id, 0.08);
  const raw = 0.2 + 0.5 * normalizedSlope + 0.2 * typeWeight + jitter;
  const sim_intensity = Math.min(Math.max(raw, 0.15), 1);

  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties: {
      landslide_id,
      source,
      state,
      district,
      landslide_type: landslide_type ?? null,
      confidence,
      date: date ?? null,
      slope_deg: Number.isFinite(slopeDeg) ? slopeDeg : null,
      sim_intensity: Number(sim_intensity.toFixed(3)),
      intensity_note: 'SIMULATED — heuristic from slope + landslide type, not a measured severity',
    },
  };
});

const out = {
  type: 'FeatureCollection',
  name: 'landslide_heatmap',
  generated_by: 'apps/authority-web/scripts/build-landslide-heatmap.mjs',
  generated_at: new Date().toISOString(),
  sources: [
    'data/processed/spatial/landslide_inventory.geojson',
    'data/final/susceptibility_dataset.csv (label=1 rows, joined by rounded lat/lon)',
  ],
  note: 'sim_intensity is a SIMULATED heuristic weight — the source data has no measured intensity/severity field.',
  features,
};

writeFileSync(OUT_PATH, JSON.stringify(out));
console.log(`Wrote ${features.length} points (${matched} joined to susceptibility terrain data) -> ${OUT_PATH}`);
