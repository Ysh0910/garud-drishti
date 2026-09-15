"""
Download ESRI 2020 10m Annual LULC for NER via Planetary Computer STAC.
No authentication required for search; asset download uses SAS tokens.
"""
import json, requests
from pathlib import Path
from datetime import datetime, timezone

LULC_DIR = Path('data/raw/lulc/esri_2020')
LULC_DIR.mkdir(parents=True, exist_ok=True)

PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1'
# NER bbox: minlon, minlat, maxlon, maxlat
NER_BBOX = [88.0, 20.0, 98.0, 30.5]

report = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'source': 'Planetary Computer - ESRI 10m Annual LULC V2',
    'collection': 'io-lulc-annual-v02',
    'year': '2020',
    'bbox': NER_BBOX,
    'tiles': [],
    'status': 'IN_PROGRESS'
}

print('Searching ESRI LULC tiles for NER...')
search_url = f'{PC_STAC}/search'
payload = {
    'collections': ['io-lulc-annual-v02'],
    'bbox': NER_BBOX,
    'datetime': '2020-01-01T00:00:00Z/2021-01-01T00:00:00Z',
    'limit': 50
}
r = requests.post(search_url, json=payload,
                  headers={'Content-Type': 'application/json'}, timeout=30)

if r.status_code != 200:
    print(f'Search failed: {r.status_code} {r.text[:200]}')
    report['status'] = f'SEARCH_FAILED_{r.status_code}'
else:
    data = r.json()
    items = data.get('features', [])
    print(f'Found {len(items)} tiles')

    for item in items:
        item_id = item.get('id', 'unknown')
        tile_info = {'id': item_id, 'bbox': item.get('bbox'), 'assets': {}}

        # Get the data asset (usually 'data' key in ESRI LULC)
        assets = item.get('assets', {})
        data_asset = assets.get('data') or assets.get('rendered_preview') or next(iter(assets.values()), None)

        if data_asset:
            # Try to get signed URL via Planetary Computer token API
            href = data_asset.get('href', '')
            if href:
                # PC provides a signing endpoint
                sign_url = f'{PC_STAC}/sign'
                try:
                    sign_resp = requests.post(sign_url, json={'href': href}, timeout=20)
                    if sign_resp.status_code == 200:
                        signed_href = sign_resp.json().get('href', href)
                    else:
                        signed_href = href
                except Exception:
                    signed_href = href

                # Download the tile
                out_path = LULC_DIR / f'esri_lulc_2020_{item_id}.tif'
                if out_path.exists():
                    print(f'  SKIP (exists): {out_path.name}')
                    tile_info['assets']['data'] = {'status': 'PRESENT', 'file': str(out_path)}
                else:
                    try:
                        print(f'  Downloading tile {item_id}...', end='', flush=True)
                        dl = requests.get(signed_href, timeout=120, stream=True)
                        if dl.status_code == 200:
                            data_bytes = b''.join(dl.iter_content(65536))
                            out_path.write_bytes(data_bytes)
                            print(f' OK ({len(data_bytes)//1024}KB)')
                            tile_info['assets']['data'] = {
                                'status': 'DOWNLOADED',
                                'file': str(out_path),
                                'size_bytes': len(data_bytes)
                            }
                        else:
                            print(f' HTTP {dl.status_code}')
                            tile_info['assets']['data'] = {'status': f'HTTP_{dl.status_code}', 'url': signed_href[:80]}
                    except Exception as e:
                        print(f' ERROR: {e}')
                        tile_info['assets']['data'] = {'status': f'ERROR: {str(e)[:60]}'}

        report['tiles'].append(tile_info)

    downloaded = sum(1 for t in report['tiles']
                     if t['assets'].get('data', {}).get('status') in ('DOWNLOADED', 'PRESENT'))
    report['status'] = 'COMPLETED' if downloaded > 0 else 'NO_TILES_DOWNLOADED'
    report['tiles_found'] = len(items)
    report['tiles_downloaded'] = downloaded

with open(LULC_DIR / 'esri_lulc_download_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f'\nStatus: {report["status"]}')
print(f'Tiles downloaded: {report.get("tiles_downloaded", 0)}/{report.get("tiles_found", 0)}')
print(f'Report: {LULC_DIR}/esri_lulc_download_report.json')
