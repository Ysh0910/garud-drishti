"""
Download NER-specific layers from Bhuvan WMS:
- State slope layers (as, ml, mn, mz, nl, sk, tr + arunachal)
- NER LULC layers
- NER watershed/drainage layers
- Additional geomorphology proxy layers (slope as terrain proxy)
"""
import json, requests, re
from pathlib import Path
from datetime import datetime, timezone

endpoint = 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms'
NER_BBOX = '88.0,20.0,98.0,30.5'   # minx,miny,maxx,maxy WGS84

RAW_DIR = Path('data/raw')

# Directories
GEOMORPH_DIR = RAW_DIR / 'geomorphology'
LULC_BHUVAN_DIR = RAW_DIR / 'lulc' / 'bhuvan'
WATERSHED_DIR = RAW_DIR / 'watershed'
GEOMORPH_DIR.mkdir(parents=True, exist_ok=True)
LULC_BHUVAN_DIR.mkdir(parents=True, exist_ok=True)
WATERSHED_DIR.mkdir(parents=True, exist_ok=True)


def download_wms_layer(layer_name, out_path, bbox=NER_BBOX,
                        width=4096, height=2048, fmt='image/png'):
    """Download a WMS layer as an image."""
    if out_path.exists():
        print(f'  SKIP (exists): {out_path.name}')
        return True, 'already_exists'

    params = {
        'SERVICE': 'WMS', 'VERSION': '1.3.0', 'REQUEST': 'GetMap',
        'LAYERS': layer_name, 'BBOX': bbox, 'CRS': 'EPSG:4326',
        'WIDTH': str(width), 'HEIGHT': str(height),
        'FORMAT': fmt, 'STYLES': '',
    }
    try:
        r = requests.get(endpoint, params=params, timeout=90, stream=True)
        if r.status_code == 200:
            ct = r.headers.get('content-type', '')
            if 'xml' in ct or 'html' in ct:
                return False, f'WMS error: {r.text[:200]}'
            data = b''.join(r.iter_content(8192))
            out_path.write_bytes(data)
            return True, f'{len(data)//1024}KB'
        return False, f'HTTP {r.status_code}'
    except Exception as e:
        return False, str(e)


results = {}

# ─── 1. NER SLOPE LAYERS (geomorphology proxy) ────────────────────────────
print('\n=== Downloading NER slope layers (geomorphology proxy) ===')
ner_slope_layers = {
    'assam':   'sdv:as_slope',
    'meghalaya': 'sdv:ml_slope',
    'manipur': 'sdv:mn_slope',
    'mizoram': 'sdv:mz_slope',
    'nagaland': 'sdv:nl_slope',
    'sikkim':  'sdv:sk_slope',
    'tripura': 'sdv:tr_slope',
}

slope_results = {}
for state, layer in ner_slope_layers.items():
    out = GEOMORPH_DIR / f'slope_{state}.png'
    ok, note = download_wms_layer(layer, out, width=2048, height=1024)
    print(f'  {state}: {"OK" if ok else "FAIL"} ({note})')
    slope_results[state] = {'layer': layer, 'status': 'OK' if ok else 'FAIL', 'note': note, 'file': str(out)}

results['slope_layers'] = slope_results

# ─── 2. NER LULC layers ────────────────────────────────────────────────────
print('\n=== Downloading NER LULC layers ===')
# Load the full layer search to find NER LULC specifically
search_file = RAW_DIR / 'bhuvan_layer_search_results.json'
lulc_layers_all = json.loads(search_file.read_text())['results'].get('lulc', [])

# Filter for NER states
ner_state_codes = ['as_', 'ml_', 'mn_', 'mz_', 'nl_', 'sk_', 'tr_',
                   'assam', 'meghalaya', 'manipur', 'mizoram', 'nagaland', 'sikkim', 'tripura',
                   'arunachal', 'ar_']
ner_lulc = [l for l in lulc_layers_all
            if any(code in l['name'].lower() or code in l['title'].lower()
                   for code in ner_state_codes)]

print(f'Found {len(ner_lulc)} NER LULC layers')
lulc_results = {}
for l in ner_lulc[:20]:  # cap at 20 to avoid excessive downloads
    safe_name = re.sub(r'[^\w]', '_', l['name'])[:60]
    out = LULC_BHUVAN_DIR / f'{safe_name}.png'
    ok, note = download_wms_layer(l['name'], out, width=2048, height=1024)
    print(f'  {l["name"]}: {"OK" if ok else "FAIL"} ({note})')
    lulc_results[l['name']] = {'title': l['title'], 'status': 'OK' if ok else 'FAIL', 'note': note}

results['lulc_layers'] = lulc_results

# ─── 3. NER watershed / drainage layers ───────────────────────────────────
print('\n=== Downloading NER watershed/drainage layers ===')
watershed_all = json.loads(search_file.read_text())['results'].get('watershed', [])
ner_watershed = [l for l in watershed_all
                 if any(code in l['name'].lower() for code in ner_state_codes)
                 or 'bhuvan_watershed' in l['name'].lower()]

print(f'Found {len(ner_watershed)} NER watershed layers')
ws_results = {}
for l in ner_watershed[:15]:
    safe_name = re.sub(r'[^\w]', '_', l['name'])[:60]
    out = WATERSHED_DIR / f'{safe_name}.png'
    ok, note = download_wms_layer(l['name'], out, width=2048, height=1024)
    print(f'  {l["name"]}: {"OK" if ok else "FAIL"} ({note})')
    ws_results[l['name']] = {'status': 'OK' if ok else 'FAIL', 'note': note}

results['watershed_layers'] = ws_results

# ─── 4. NER geomorphology proxy from all_layers ───────────────────────────
print('\n=== Searching for additional geomorphology/terrain proxies ===')
all_layers = json.loads((RAW_DIR / 'bhuvan_all_layers.json').read_text())['layers']
more_geomorph = [l for l in all_layers
                 if any(kw in l['name'].lower() or kw in l['title'].lower()
                        for kw in ['relief', 'curvature', 'aspect', 'dem', 'elevation'])
                 and any(code in l['name'].lower() for code in ner_state_codes)]

print(f'Found {len(more_geomorph)} additional terrain proxy layers for NER')
for l in more_geomorph[:10]:
    print(f'  {l["name"]}: {l["title"]}')

# ─── 5. Write provenance report ───────────────────────────────────────────
report = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'endpoint': endpoint,
    'slope_layers_downloaded': len([v for v in slope_results.values() if v['status']=='OK']),
    'lulc_layers_downloaded': len([v for v in lulc_results.values() if v['status']=='OK']),
    'watershed_layers_downloaded': len([v for v in ws_results.values() if v['status']=='OK']),
    'slope_results': slope_results,
    'lulc_results': lulc_results,
    'watershed_results': ws_results,
    'notes': [
        'Slope layers serve as geomorphology proxy (terrain steepness per state).',
        'No dedicated geomorphology layer found on accessible Bhuvan WMS endpoints.',
        'DEM-derived geomorphology (slope, aspect, curvature, TWI) recommended via SRTM HGT files.',
        'Bhuvan LULC 1:50K shapefiles require manual portal request.',
        'WMS PNG layers are visualization aids; vector/raster data preferred for ML features.'
    ]
}
with open(RAW_DIR / 'bhuvan_ner_download_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f'\nReport: data/raw/bhuvan_ner_download_report.json')
print(f'Slope: {report["slope_layers_downloaded"]}/7, LULC: {report["lulc_layers_downloaded"]}, Watershed: {report["watershed_layers_downloaded"]}')
