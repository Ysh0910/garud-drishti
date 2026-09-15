"""
Derive terrain features from SRTM HGT tiles for NER.
Produces: slope, aspect, curvature rasters + a merged VRT for the full NER region.
This IS the geomorphology layer — DEM-derived terrain analysis is the standard
approach for landslide susceptibility models.

Outputs:
  data/raw/geomorphology/terrain_features/
    slope_ner.tif
    aspect_ner.tif  
    elevation_ner.tif
    curvature_ner.tif (if richdem available)
    terrain_metadata.json
"""
import json, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone

GEOMORPH_DIR = Path('data/raw/geomorphology') / 'terrain_features'
GEOMORPH_DIR.mkdir(parents=True, exist_ok=True)
DEM_DIR = Path('data/raw/dem/srtm')

import rasterio
import numpy as np
from rasterio.merge import merge
from rasterio.enums import Resampling
import re

# ─── 1. Collect NER HGT tiles ─────────────────────────────────────────────────
hgt_files = list(DEM_DIR.rglob('*.hgt')) + list(DEM_DIR.rglob('*.HGT'))

ner_hgts = []
for f in hgt_files:
    m = re.match(r'([NS])(\d+)([EW])(\d+)', f.stem, re.IGNORECASE)
    if m:
        lat = int(m.group(2)) * (1 if m.group(1).upper()=='N' else -1)
        lon = int(m.group(4)) * (1 if m.group(3).upper()=='E' else -1)
        if 20 <= lat <= 30 and 88 <= lon <= 98:
            ner_hgts.append(f)

print(f'NER HGT tiles found: {len(ner_hgts)}')
if not ner_hgts:
    print('ERROR: No NER HGT tiles found. Run DEM download first.')
    sys.exit(1)

# ─── 2. Open and merge tiles ─────────────────────────────────────────────────
print('Opening HGT files...')
datasets = []
for hgt in sorted(ner_hgts):
    try:
        ds = rasterio.open(hgt)
        datasets.append(ds)
    except Exception as e:
        print(f'  Warn: could not open {hgt.name}: {e}')

if not datasets:
    print('ERROR: No datasets could be opened.')
    sys.exit(1)

print(f'Merging {len(datasets)} tiles...')
merged_arr, merged_transform = merge(datasets, resampling=Resampling.nearest)

# Close datasets
for ds in datasets:
    ds.close()

# Get CRS from first file
with rasterio.open(sorted(ner_hgts)[0]) as ds:
    # Avoid EPSG lookup due to possible PROJ db conflict from PostgreSQL
    # Use WKT string directly for WGS84
    WGS84_WKT = (
        'GEOGCS["WGS 84",DATUM["WGS_1984",'
        'SPHEROID["WGS 84",6378137,298.257223563]],'
        'PRIMEM["Greenwich",0],'
        'UNIT["degree",0.0174532925199433,'
        'AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'
    )
    try:
        crs = ds.crs if (ds.crs and str(ds.crs) != 'None') else rasterio.crs.CRS.from_wkt(WGS84_WKT)
    except Exception:
        crs = rasterio.crs.CRS.from_wkt(WGS84_WKT)
    nodata = ds.nodata if ds.nodata else -32768

elevation = merged_arr[0].astype(np.float32)
elevation[elevation == nodata] = np.nan

bounds_arr = merged_arr
height, width = elevation.shape
print(f'Merged elevation: {height}x{width} pixels')

# ─── 3. Save elevation mosaic ────────────────────────────────────────────────
elev_out = GEOMORPH_DIR / 'elevation_ner.tif'
profile = {
    'driver': 'GTiff',
    'dtype': 'float32',
    'width': width,
    'height': height,
    'count': 1,
    'crs': crs,
    'transform': merged_transform,
    'nodata': -9999.0,
    'compress': 'lzw',
}
elev_save = elevation.copy()
elev_save[np.isnan(elevation)] = -9999.0
with rasterio.open(elev_out, 'w', **profile) as dst:
    dst.write(elev_save[np.newaxis, :, :])
print(f'Saved: {elev_out.name} ({elev_out.stat().st_size//1024//1024}MB)')

# ─── 4. Compute slope and aspect ─────────────────────────────────────────────
# Cell size in degrees -> convert to metres for slope calculation
# At NER latitudes (~25N), 1 degree ~ 111km N-S, ~100km E-W
deg_x = abs(merged_transform.a)  # pixel width in degrees
deg_y = abs(merged_transform.e)  # pixel height in degrees

# Approximate metres per degree at NER centre (~25N)
lat_c = 25.0
m_per_deg_lat = 111132.0
m_per_deg_lon = 111132.0 * np.cos(np.radians(lat_c))

cell_x = deg_x * m_per_deg_lon   # metres
cell_y = deg_y * m_per_deg_lat

print(f'Cell size: {cell_x:.1f}m x {cell_y:.1f}m')

# Pad for gradient computation
elev_pad = np.pad(elevation, 1, mode='edge')

# Gradient using Zevenbergen & Thorne (1987) - standard for slope
dz_dx = (elev_pad[1:-1, 2:] - elev_pad[1:-1, :-2]) / (2 * cell_x)
dz_dy = (elev_pad[:-2, 1:-1] - elev_pad[2:, 1:-1]) / (2 * cell_y)

# Slope in degrees
slope = np.degrees(np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))).astype(np.float32)
slope[np.isnan(elevation)] = -9999.0

slope_out = GEOMORPH_DIR / 'slope_ner.tif'
with rasterio.open(slope_out, 'w', **profile) as dst:
    dst.write(slope[np.newaxis, :, :])
print(f'Saved: {slope_out.name}  (range: {np.nanmin(slope[slope>-9999]):.1f}° - {np.nanmax(slope[slope>-9999]):.1f}°)')

# Aspect in degrees (0=N, 90=E, 180=S, 270=W)
aspect = np.degrees(np.arctan2(-dz_dx, dz_dy)) % 360
aspect = aspect.astype(np.float32)
aspect[np.isnan(elevation)] = -9999.0

aspect_out = GEOMORPH_DIR / 'aspect_ner.tif'
with rasterio.open(aspect_out, 'w', **profile) as dst:
    dst.write(aspect[np.newaxis, :, :])
print(f'Saved: {aspect_out.name}')

# ─── 5. Curvature (plan + profile) ────────────────────────────────────────────
# Using second derivatives
d2z_dx2 = (elev_pad[1:-1, 2:] - 2*elevation + elev_pad[1:-1, :-2]) / (cell_x**2)
d2z_dy2 = (elev_pad[:-2, 1:-1] - 2*elevation + elev_pad[2:, 1:-1]) / (cell_y**2)

# Total curvature (Laplacian proxy)
curvature = (d2z_dx2 + d2z_dy2).astype(np.float32)
curvature[np.isnan(elevation)] = -9999.0

curv_out = GEOMORPH_DIR / 'curvature_ner.tif'
with rasterio.open(curv_out, 'w', **profile) as dst:
    dst.write(curvature[np.newaxis, :, :])
print(f'Saved: {curv_out.name}')

# ─── 6. Write metadata ────────────────────────────────────────────────────────
meta = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source': 'SRTM DEM via Viewfinder Panoramas DEM3',
    'crs': 'EPSG:4326 (WGS84)',
    'resolution_degrees': {'x': deg_x, 'y': deg_y},
    'resolution_metres_approx': {'x': round(cell_x, 1), 'y': round(cell_y, 1)},
    'ner_extent': {'lat': [20, 30], 'lon': [88, 98]},
    'grid_size': {'rows': height, 'cols': width},
    'source_tiles': len(ner_hgts),
    'features': {
        'elevation_ner.tif': {
            'unit': 'metres', 'description': 'Elevation above sea level',
            'min': float(np.nanmin(elevation[elevation > -9999])),
            'max': float(np.nanmax(elevation[elevation > -9999]))
        },
        'slope_ner.tif': {
            'unit': 'degrees', 'description': 'Terrain slope (Zevenbergen & Thorne)',
            'min': float(np.nanmin(slope[slope > -9999])),
            'max': float(np.nanmax(slope[slope > -9999]))
        },
        'aspect_ner.tif': {
            'unit': 'degrees (0=N, clockwise)', 'description': 'Slope aspect direction'
        },
        'curvature_ner.tif': {
            'unit': '1/m^2', 'description': 'Total curvature (Laplacian, positive=convex)'
        }
    },
    'nodata_value': -9999.0,
    'notes': [
        'HGT tiles have no explicit CRS — WGS84/EPSG:4326 assumed (SRTM standard).',
        'Slope/aspect/curvature computed using finite differences with approximate metre cell sizes at 25N.',
        'For production use, reproject to UTM (EPSG:32645/32646) before computing terrain derivatives.',
        'These features serve as the geomorphology layer for Model 1 (susceptibility).'
    ]
}

with open(GEOMORPH_DIR / 'terrain_metadata.json', 'w') as f:
    json.dump(meta, f, indent=2)

print(f'\nAll terrain features generated in: {GEOMORPH_DIR}')
print(f'Features: elevation, slope, aspect, curvature')
print(f'Grid: {height}x{width} at ~{cell_x:.0f}m resolution')
