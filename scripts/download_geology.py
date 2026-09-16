"""
Download geology data for NER.
Strategy:
1. Try USGS GMNA / OneGeology WFS/WCS for lithology
2. Use SoilGrids (ISRIC) for soil parent material / WRB soil class as proxy
3. Use GLIM (Global Lithological Map) - available via Zenodo/GitHub
"""
import requests, json, zipfile, io
from pathlib import Path
from datetime import datetime, timezone

GEO_DIR = Path('data/raw/geology')
GEO_DIR.mkdir(parents=True, exist_ok=True)

report = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'attempts': [],
    'status': 'IN_PROGRESS'
}

# ─── 1. GLIM (Global Lithological Map) via Zenodo ─────────────────────────────
# Hartmann & Moosdorf 2012 - freely available global lithological map
print('Attempting GLIM Global Lithological Map...')
glim_urls = [
    # The GLIM shapefile is hosted at various mirrors
    'https://zenodo.org/record/3653428/files/GLIM_v1.zip',
    'https://zenodo.org/record/3653428/files/lithology_glim.zip',
    'https://www.geo.uni-hamburg.de/geologie/forschung/geochemie/downloads/glim.zip',
]

glim_ok = False
for url in glim_urls:
    try:
        print(f'  Testing: {url[-60:]}')
        r = requests.head(url, timeout=12, allow_redirects=True)
        if r.status_code == 200:
            size_mb = int(r.headers.get('content-length', 0)) // 1024 // 1024
            print(f'  Accessible ({size_mb}MB), downloading...')
            r2 = requests.get(url, timeout=300, stream=True)
            if r2.status_code == 200:
                data = b''.join(r2.iter_content(65536))
                out = GEO_DIR / 'glim_lithology.zip'
                out.write_bytes(data)
                # Try to extract
                try:
                    zf = zipfile.ZipFile(io.BytesIO(data))
                    for name in zf.namelist()[:20]:
                        print(f'    Contains: {name}')
                    zf.extractall(GEO_DIR / 'glim')
                    print(f'  GLIM extracted to {GEO_DIR}/glim/')
                except Exception as e:
                    print(f'  Could not extract ZIP: {e}')
                glim_ok = True
                report['attempts'].append({'source': 'GLIM Zenodo', 'url': url, 'status': 'DOWNLOADED'})
                break
        else:
            report['attempts'].append({'source': 'GLIM Zenodo', 'url': url, 'status': f'HTTP_{r.status_code}'})
    except Exception as e:
        report['attempts'].append({'source': 'GLIM Zenodo', 'url': url, 'status': f'ERROR: {str(e)[:60]}'})

if not glim_ok:
    print('  GLIM not accessible from tested URLs')

# ─── 2. SoilGrids WCS for soil class (geology proxy) ─────────────────────────
print('\nAttempting SoilGrids WRB soil classification (WCS)...')
# ISRIC SoilGrids 2.0 - WCS endpoint for WRB Most Probable soil group
# Covers: global, 250m resolution
SOILGRIDS_WCS = 'https://maps.isric.org/mapserv?map=/map/wrb.map'
bbox = '88.0,20.0,98.0,30.5'  # NER WGS84
params = {
    'SERVICE': 'WCS',
    'VERSION': '1.0.0',
    'REQUEST': 'GetCoverage',
    'COVERAGE': 'MostProbable',
    'CRS': 'EPSG:4326',
    'BBOX': bbox,
    'RESX': '0.002',  # ~250m in degrees
    'RESY': '0.002',
    'FORMAT': 'GEOTIFF_INT16',
}
try:
    r = requests.get(SOILGRIDS_WCS, params=params, timeout=120, stream=True)
    ct = r.headers.get('content-type', '')
    print(f'  Status: {r.status_code}, Content-Type: {ct}')
    if r.status_code == 200 and ('tiff' in ct.lower() or 'geotiff' in ct.lower() or len(r.content) > 10000):
        out = GEO_DIR / 'soilgrids_wrb_ner.tif'
        out.write_bytes(r.content)
        size_kb = len(r.content) // 1024
        print(f'  SoilGrids WRB downloaded: {out.name} ({size_kb}KB)')
        report['attempts'].append({'source': 'SoilGrids WCS', 'status': 'DOWNLOADED', 'size_bytes': len(r.content)})
    else:
        resp_text = r.text[:300] if r.text else ''
        print(f'  WCS response not a raster: {resp_text}')
        report['attempts'].append({'source': 'SoilGrids WCS', 'status': f'NOT_RASTER', 'response': resp_text[:100]})
except Exception as e:
    print(f'  SoilGrids WCS error: {e}')
    report['attempts'].append({'source': 'SoilGrids WCS', 'status': f'ERROR: {str(e)[:80]}'})

# ─── 3. SoilGrids REST API (newer endpoint) ─────────────────────────────────
print('\nAttempting SoilGrids REST API (250m WRB)...')
# New SoilGrids uses a different WCS endpoint
REST_BASE = 'https://files.isric.org/soilgrids/latest/data/wrb/MostProbable'
try:
    # Use the tile service - check a tile covering NER
    tile_url = f'{REST_BASE}?service=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=MostProbable&SUBSET=X(88,98)&SUBSET=Y(20,30.5)&FORMAT=image/tiff'
    r = requests.get(tile_url, timeout=60, stream=True)
    print(f'  Status: {r.status_code}')
    if r.status_code == 200:
        data = b''.join(r.iter_content(65536))
        if len(data) > 10000:
            out = GEO_DIR / 'soilgrids_wrb_ner_rest.tif'
            out.write_bytes(data)
            print(f'  Downloaded: {out.name} ({len(data)//1024}KB)')
            report['attempts'].append({'source': 'SoilGrids REST', 'status': 'DOWNLOADED', 'size_bytes': len(data)})
        else:
            print(f'  Response too small ({len(data)} bytes)')
    report['attempts'].append({'source': 'SoilGrids REST', 'status': f'HTTP_{r.status_code}'})
except Exception as e:
    print(f'  Error: {e}')
    report['attempts'].append({'source': 'SoilGrids REST', 'status': f'ERROR: {str(e)[:80]}'})

# ─── 4. OneGeology WMS for geology ────────────────────────────────────────────
print('\nAttempting OneGeology WMS (CGMW geology)...')
OG_WMS = 'http://mapsone.brgm.fr/1GDL/CGMW_WORLD/wms'
params_wms = {
    'SERVICE': 'WMS', 'VERSION': '1.3.0', 'REQUEST': 'GetMap',
    'LAYERS': 'World_CGMW_50M_Geology',
    'BBOX': '20.0,88.0,30.5,98.0',  # minlat,minlon,maxlat,maxlon for 1.3.0
    'CRS': 'EPSG:4326', 'WIDTH': '2048', 'HEIGHT': '2048',
    'FORMAT': 'image/png', 'STYLES': ''
}
try:
    r = requests.get(OG_WMS, params=params_wms, timeout=30)
    print(f'  Status: {r.status_code}, Content-Type: {r.headers.get("content-type", "?")}')
    if r.status_code == 200 and 'image' in r.headers.get('content-type', ''):
        import numpy as np
        from PIL import Image
        img = Image.open(io.BytesIO(r.content))
        arr = np.array(img)
        pct_white = float((arr == 255).all(axis=-1).mean() * 100)
        print(f'  Image: {img.size}, {pct_white:.1f}% white')
        if pct_white < 90:
            out = GEO_DIR / 'onegeology_cgmw_ner.png'
            out.write_bytes(r.content)
            print(f'  Saved: {out.name}')
            report['attempts'].append({'source': 'OneGeology CGMW WMS', 'status': 'DOWNLOADED', 'pct_white': pct_white})
        else:
            print('  Image appears blank')
            report['attempts'].append({'source': 'OneGeology CGMW WMS', 'status': 'BLANK_IMAGE'})
    else:
        report['attempts'].append({'source': 'OneGeology CGMW WMS', 'status': f'HTTP_{r.status_code}'})
except Exception as e:
    print(f'  Error: {e}')
    report['attempts'].append({'source': 'OneGeology CGMW WMS', 'status': f'ERROR: {str(e)[:80]}'})

# ─── 5. Write provenance ─────────────────────────────────────────────────────
downloaded = [a for a in report['attempts'] if a['status'] == 'DOWNLOADED']
report['status'] = 'PARTIAL' if downloaded else 'BLOCKED'
report['notes'] = [
    'GLIM (Global Lithological Map) - Hartmann & Moosdorf 2012 - ideal for geology features.',
    'SoilGrids WRB soil classification is a reasonable proxy for lithology/geology.',
    'GSI Bhukosh (https://bhukosh.gsi.gov.in/) is the authoritative Indian geology source - requires registration.',
    'For ML training, WRB soil class / parent material can serve as geology feature until GSI data is obtained.'
]

with open(GEO_DIR / 'geology_download_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f'\nStatus: {report["status"]}')
print(f'Downloaded sources: {[a["source"] for a in downloaded]}')
print(f'Report: {GEO_DIR}/geology_download_report.json')
