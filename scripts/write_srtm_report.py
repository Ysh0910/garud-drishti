import json, re
from pathlib import Path
from datetime import datetime, timezone

DEM_DIR = Path('data/raw/dem/srtm')
hgt_files = list(DEM_DIR.rglob('*.hgt')) + list(DEM_DIR.rglob('*.HGT'))

ner_tiles = []
for f in hgt_files:
    m = re.match(r'([NS])(\d+)([EW])(\d+)', f.stem, re.IGNORECASE)
    if m:
        lat = int(m.group(2)) * (1 if m.group(1).upper()=='N' else -1)
        lon = int(m.group(4)) * (1 if m.group(3).upper()=='E' else -1)
        if 20 <= lat <= 30 and 88 <= lon <= 98:
            ner_tiles.append({'file': f.name, 'lat': lat, 'lon': lon, 'size_bytes': f.stat().st_size})

report = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'status': 'NER_TILES_PRESENT',
    'source': 'Viewfinder Panoramas DEM3 (3 arc-second, SRTM-based)',
    'source_url': 'http://viewfinderpanoramas.org/dem3/',
    'original_manifest': 'data/raw/srtm_v3_6aa3cfb7243c85a5.zip (USGS EarthExplorer manifest CSV - not actual DEM)',
    'crs': 'WGS84 EPSG:4326 (assumed - SRTM standard)',
    'resolution': '3 arc-second (~90m)',
    'format': 'HGT binary',
    'ner_tiles_count': len(ner_tiles),
    'ner_lat_range': {'min': min(t['lat'] for t in ner_tiles), 'max': max(t['lat'] for t in ner_tiles)},
    'ner_lon_range': {'min': min(t['lon'] for t in ner_tiles), 'max': max(t['lon'] for t in ner_tiles)},
    'ner_tiles': ner_tiles,
    'packages_downloaded': ['G45 (lon84-90,lat20-30)', 'G46 (lon90-96,lat20-30)', 'G47 (lon96-102,lat20-30)'],
    'notes': [
        'USGS SRTM v3 manifest CSV was present but contains tile metadata only, not actual DEM data.',
        'Actual DEM HGT files downloaded from Viewfinder Panoramas (SRTM-derived 90m DEM).',
        '44 NER 1-degree tiles available covering lat20-30N, lon88-98E.',
        'Feature derivation (slope, aspect, curvature) to be performed in ml/preprocessing/ using rasterio/GDAL.'
    ]
}

out = DEM_DIR / 'srtm_ner_validation_report.json'
with open(out, 'w') as f:
    json.dump(report, f, indent=2)
print(f'Report written: {out}')
print(f'NER tiles: {len(ner_tiles)}')
print(f'Lat range: {report["ner_lat_range"]}')
print(f'Lon range: {report["ner_lon_range"]}')
