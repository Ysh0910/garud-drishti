"""Check if WMS tiles returned by Bhuvan contain real data."""
import requests
from pathlib import Path
from PIL import Image
import io, numpy as np, json

def check_png(path):
    p = Path(path)
    if not p.exists():
        return 'NOT_FOUND'
    img = Image.open(io.BytesIO(p.read_bytes()))
    arr = np.array(img)
    mean_val = float(arr.mean())
    n_white = int((arr == 255).all(axis=-1).sum()) if arr.ndim == 3 else 0
    total_px = arr.shape[0] * arr.shape[1]
    pct_white = round(n_white / total_px * 100, 1)
    return {'size': img.size, 'mean': round(mean_val, 1), 'pct_white': pct_white, 'real_data': pct_white < 90}

print('Checking existing PNGs:')
print('  geology_ner_wms.png:', check_png('data/raw/geology/geology_ner_wms.png'))
print('  slope_assam.png:', check_png('data/raw/geomorphology/slope_assam.png'))

# Try Bhuvan with a small test window to see if the layer is visible at all
print('\nTesting WMS direct request:')
endpoint = 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms'

test_layers = [
    ('cleanganga:LITHOLOG', '75,20,90,30'),   # slightly west of NER - Clean Ganga basin
    ('cleanganga:LITHOLOG', '88,24,98,28'),    # NER bbox
    ('sdv:as_slope', '89.7,24.1,96.0,27.9'),  # Assam bbox
]

for layer, bbox in test_layers:
    params = {
        'SERVICE': 'WMS', 'VERSION': '1.3.0', 'REQUEST': 'GetMap',
        'LAYERS': layer, 'BBOX': bbox, 'CRS': 'EPSG:4326',
        'WIDTH': '512', 'HEIGHT': '256', 'FORMAT': 'image/png', 'STYLES': '',
    }
    try:
        r = requests.get(endpoint, params=params, timeout=30)
        ct = r.headers.get('content-type', '')
        if 'xml' in ct or 'html' in ct:
            print(f'  {layer} [{bbox}]: WMS error - {r.text[:100]}')
            continue
        img = Image.open(io.BytesIO(r.content))
        arr = np.array(img)
        pct_white = float((arr == 255).all(axis=-1).mean() * 100)
        print(f'  {layer} [{bbox}]: {img.size} {pct_white:.1f}% white')
    except Exception as e:
        print(f'  {layer}: ERROR {e}')
