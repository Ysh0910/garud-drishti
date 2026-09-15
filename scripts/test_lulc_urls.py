import requests

test_urls = [
    'https://esa-worldcover.s3.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N24E090_Map.tif',
    'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v100/2020/map/ESA_WorldCover_10m_2020_v100_N24E090_Map.tif',
    'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N24E090_Map.tif',
    # Try CGIAR soil grids for geology proxy
    'https://files.isric.org/soilgrids/latest/data/wrb/MostProbable/MostProbable_0-5cm_mean.tif',
    # Try Natural Earth geology GeoJSON
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson',
]

for url in test_urls:
    try:
        r = requests.head(url, timeout=12, allow_redirects=True)
        cl = r.headers.get('content-length', '?')
        print(f'{r.status_code} size={cl}: {url[-70:]}')
    except Exception as e:
        print(f'ERR {str(e)[:40]}: {url[-50:]}')
