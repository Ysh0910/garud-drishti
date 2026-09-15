"""Find the correct ESA WorldCover tile naming convention."""
import requests

# The test showed N24E090 worked -- that's a 3-degree tile SW corner: lat 24N, lon 90E
# But our script used N20E087, N23E087 etc.
# WorldCover v200 uses 3-degree tiles. Let's verify actual tile boundaries:
# N24E090 -> covers lat 24-27N, lon 90-93E (SW corner at 24N, 90E)

# For NER lat 20-30N, lon 88-98E, the 3-degree tile SW corners would be:
# Lats: 21, 24, 27 (tiles that START at those lat)... or 20,23,26,29?
# Let's test several variants

BASE = 'https://esa-worldcover.s3.amazonaws.com/v200/2021/map'

candidates = [
    'N21E087', 'N21E090', 'N21E093', 'N21E096',
    'N24E087', 'N24E090', 'N24E093', 'N24E096',
    'N27E087', 'N27E090', 'N27E093', 'N27E096',
    'N20E088', 'N20E090', 'N22E090', 'N25E090',
]

for tile in candidates:
    url = f'{BASE}/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif'
    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        size_mb = int(r.headers.get('content-length', 0)) // 1024 // 1024
        status = f'OK {size_mb}MB' if r.status_code == 200 else f'HTTP {r.status_code}'
        print(f'  {tile}: {status}')
    except Exception as e:
        print(f'  {tile}: ERR')
