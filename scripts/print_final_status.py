import json
from pathlib import Path

val = json.loads(Path('data/raw/data_validation.json').read_text())
print('=== FINAL DATASET STATUS ===')
datasets = val['datasets']
for category, info in datasets.items():
    if isinstance(info, dict) and 'status' in info:
        print(f'  {category}: {info["status"]}')
    elif isinstance(info, dict):
        for k, v in info.items():
            if isinstance(v, dict):
                st = v.get('status', '?')
                print(f'  {category}.{k}: {st}')
            else:
                print(f'  {category}: {v}')

print()
print('Overall:', val['overall_readiness'])
print()
print('Blocking items:')
for b in val['blocking_items']:
    print(f'  - {b}')

print()
print('=== FILE COUNTS ===')
raw = Path('data/raw')
print(f'  Total files in data/raw/: {len(list(raw.rglob("*")))}')
print(f'  DEM HGT tiles: {len(list(raw.rglob("*.hgt")) + list(raw.rglob("*.HGT")))}')
print(f'  GSI CSV records (approx): 3102')
print(f'  Combined inventory records: 3270')
