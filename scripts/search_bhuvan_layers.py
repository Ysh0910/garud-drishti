"""Search Bhuvan WMS layers for geomorphology, terrain, soil, NER-specific data."""
import json, requests
from pathlib import Path
from xml.etree import ElementTree as ET
from datetime import datetime, timezone

endpoint = 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms'
caps_url = endpoint + '?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0'

print('Fetching WMS capabilities...')
r = requests.get(caps_url, timeout=90)
root = ET.fromstring(r.text)
ns = root.tag.split('}')[0]+'}' if root.tag.startswith('{') else ''

all_layers = []
for le in root.iter(f'{ns}Layer'):
    n = le.find(f'{ns}Name')
    t = le.find(f'{ns}Title')
    if n is not None and n.text:
        all_layers.append({
            'name': n.text.strip(),
            'title': (t.text or '').strip() if t is not None else ''
        })

print(f'Total layers: {len(all_layers)}')

# Save full layer list
out_dir = Path('data/raw')
with open(out_dir / 'bhuvan_all_layers.json', 'w') as f:
    json.dump({'total': len(all_layers), 'layers': all_layers}, f, indent=2)
print(f'Saved all layers to data/raw/bhuvan_all_layers.json')

# Search with multiple keywords
keyword_groups = {
    'geomorphology': ['geomorph', 'landform', 'morph'],
    'terrain': ['terrain', 'slope', 'elevation', 'dem', 'srtm'],
    'NER_states': ['arunachal', 'assam', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura', 'northeast', 'NER'],
    'soil': ['soil', 'sediment', 'alluvial'],
    'geology': ['geolog', 'litho', 'rock', 'formation', 'bhukosh'],
    'landslide': ['landslide', 'hazard', 'risk', 'disaster'],
    'watershed': ['watershed', 'drainage', 'basin', 'river'],
    'lulc': ['lulc', 'landuse', 'landcover', 'forest', 'vegetation'],
}

results = {}
for group, keywords in keyword_groups.items():
    matches = []
    for l in all_layers:
        combined = (l['name'] + ' ' + l['title']).lower()
        if any(kw.lower() in combined for kw in keywords):
            matches.append(l)
    results[group] = matches
    if matches:
        print(f'\n[{group}]: {len(matches)} layers')
        for m in matches[:8]:
            print(f'  {m["name"]}: {m["title"]}')
    else:
        print(f'\n[{group}]: 0 layers')

# Save search results
with open(out_dir / 'bhuvan_layer_search_results.json', 'w') as f:
    json.dump({
        'searched_at': datetime.now(timezone.utc).isoformat(),
        'endpoint': endpoint,
        'total_layers': len(all_layers),
        'results': results
    }, f, indent=2)
print('\nSearch results saved.')
