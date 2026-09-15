import requests, json

PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1'
r = requests.post(PC_STAC + '/search', json={
    'collections': ['io-lulc-annual-v02'],
    'bbox': [88.0, 20.0, 98.0, 30.5],
    'datetime': '2020-01-01T00:00:00Z/2021-01-01T00:00:00Z',
    'limit': 3
}, headers={'Content-Type': 'application/json'}, timeout=20)

items = r.json().get('features', [])
if items:
    item = items[0]
    print('Item ID:', item['id'])
    print('BBox:', item.get('bbox'))
    for k, v in item.get('assets', {}).items():
        href = v.get('href', '')
        print(f'  [{k}]: {href[:100]}')
    
    # Try to directly access the data href (no signing)
    data_href = item['assets'].get('data', {}).get('href', '')
    if data_href:
        print('\nTesting direct access:', data_href[:80])
        r2 = requests.head(data_href, timeout=15, allow_redirects=True)
        print('Status:', r2.status_code, 'Size:', r2.headers.get('content-length', '?'))
