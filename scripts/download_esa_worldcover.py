"""
Download ESA WorldCover 2021 (10m) for NER via public S3 bucket.
Fully open, no authentication required.
Coverage: Global, 10m resolution, 11 land cover classes.
Source: https://worldcover2021.esa.int/
AWS Open Data: s3://esa-worldcover/v200/2021/map/
"""
import requests, json
from pathlib import Path
from datetime import datetime, timezone

LULC_DIR = Path('data/raw/lulc/esa_worldcover')
LULC_DIR.mkdir(parents=True, exist_ok=True)

# ESA WorldCover 2021 tiles via Copernicus public S3
# Tile naming: ESA_WorldCover_10m_2021_v200_<TileH>_<TileV>_Map.tif
# Tiles are 3x3 degree, named by SW corner (e.g. N24E090 = 24N-27N, 90E-93E)
# For NER: lat 20-30N, lon 88-98E
# Each tile covers 3x3 degrees

# ESA WorldCover tiles via their public download
# Base URL pattern: https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/
BASE_URL = 'https://esa-worldcover.s3.amazonaws.com/v200/2021/map'

# Also try the alternative stac
STAC_URL = 'https://services.terrascope.be/stac/v1'

def esa_tile_name(lat, lon):
    """Get ESA WorldCover tile name for a given SW corner lat/lon."""
    lat_str = f'N{lat:02d}' if lat >= 0 else f'S{abs(lat):02d}'
    lon_str = f'E{lon:03d}' if lon >= 0 else f'W{abs(lon):03d}'
    return f'ESA_WorldCover_10m_2021_v200_{lat_str}{lon_str}_Map'

# Compute NER tiles (3-degree tiles, SW corners)
# ESA WorldCover uses 3-degree tiles at lat multiples of 3 from equator
# For NER lat 20-30N: tiles at lat 21N, 24N, 27N cover up to 30N
# For lon 88-98E: tiles at lon 87E (87-90), 90E (90-93), 93E (93-96), 96E (96-99)
ner_tiles = []
for lat in range(21, 30, 3):  # 21, 24, 27
    for lon in range(87, 99, 3):  # 87, 90, 93, 96
        ner_tiles.append((lat, lon))

print(f'NER tiles to download: {len(ner_tiles)}')
for t in ner_tiles:
    print(f'  lat={t[0]}-{t[0]+3}N, lon={t[1]}-{t[1]+3}E -> {esa_tile_name(t[0], t[1])}')

report = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source': 'ESA WorldCover 2021 v2.0',
    'source_url': 'https://worldcover2021.esa.int/',
    'resolution': '10m',
    'classes': 11,
    'license': 'CC-BY 4.0',
    'tiles': []
}

downloaded = 0
for lat, lon in ner_tiles:
    tile_name = esa_tile_name(lat, lon)
    out_path = LULC_DIR / f'{tile_name}.tif'

    if out_path.exists():
        size = out_path.stat().st_size
        print(f'  SKIP (exists): {tile_name} ({size//1024//1024}MB)')
        report['tiles'].append({'tile': tile_name, 'status': 'PRESENT', 'file': str(out_path)})
        downloaded += 1
        continue

    url = f'{BASE_URL}/{tile_name}.tif'
    try:
        print(f'  Downloading {tile_name}...', end='', flush=True)
        r = requests.get(url, timeout=300, stream=True)
        if r.status_code == 200:
            chunks = []
            for chunk in r.iter_content(65536):
                chunks.append(chunk)
            data = b''.join(chunks)
            out_path.write_bytes(data)
            size_mb = len(data) // 1024 // 1024
            print(f' OK ({size_mb}MB)')
            report['tiles'].append({
                'tile': tile_name,
                'status': 'DOWNLOADED',
                'file': str(out_path),
                'size_bytes': len(data),
                'lat_range': f'{lat}-{lat+3}N',
                'lon_range': f'{lon}-{lon+3}E'
            })
            downloaded += 1
        else:
            print(f' HTTP {r.status_code}')
            report['tiles'].append({'tile': tile_name, 'status': f'HTTP_{r.status_code}', 'url': url})
    except Exception as e:
        print(f' ERROR: {str(e)[:80]}')
        report['tiles'].append({'tile': tile_name, 'status': f'ERROR: {str(e)[:60]}'})

report['tiles_downloaded'] = downloaded
report['tiles_total'] = len(ner_tiles)
report['status'] = 'COMPLETED' if downloaded > 0 else 'FAILED'

# Write provenance
with open(LULC_DIR / 'esa_worldcover_download_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f'\nDownloaded: {downloaded}/{len(ner_tiles)} tiles')
print(f'Status: {report["status"]}')
print(f'Report: {LULC_DIR}/esa_worldcover_download_report.json')
