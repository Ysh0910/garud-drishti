"""
Download GLIM (Global Lithological Map) for NER geology feature.
Hartmann & Moosdorf 2012 - the standard global lithology dataset for landslide models.
Available via multiple public repositories.
"""
import requests, json, zipfile, io
from pathlib import Path
from datetime import datetime, timezone

GEO_DIR = Path('data/raw/geology')
GEO_DIR.mkdir(parents=True, exist_ok=True)

report = {'generated_at': datetime.now(timezone.utc).isoformat(), 'attempts': []}

# GLIM Zenodo correct URL (record 3897899 is the updated version)
glim_urls = [
    ('Zenodo 3897899', 'https://zenodo.org/record/3897899/files/GLIM_v1.zip'),
    ('Zenodo 3897899 shp', 'https://zenodo.org/record/3897899/files/GLIM_v1.shp'),
    # GitHub mirror
    ('GitHub mirror', 'https://github.com/hartmann-j/GLIM/archive/refs/heads/main.zip'),
    # Direct from Uni Hamburg
    ('Hamburg direct', 'https://www.geo.uni-hamburg.de/geologie/forschung/geochemie/litholmod/glim_v1.zip'),
]

downloaded = False
for name, url in glim_urls:
    try:
        print(f'Trying {name}: {url[-60:]}')
        r = requests.head(url, timeout=15, allow_redirects=True)
        status = r.status_code
        size = int(r.headers.get('content-length', 0))
        print(f'  Status: {status}, Size: {size//1024//1024}MB')
        if status == 200 and size > 1000:
            print(f'  Downloading...')
            r2 = requests.get(url, timeout=300, stream=True)
            if r2.status_code == 200:
                data = b''.join(r2.iter_content(65536))
                out = GEO_DIR / 'glim_v1.zip'
                out.write_bytes(data)
                print(f'  Saved: {out.name} ({len(data)//1024//1024}MB)')
                # Extract
                try:
                    zf = zipfile.ZipFile(io.BytesIO(data))
                    names = zf.namelist()
                    print(f'  ZIP contents ({len(names)} files):')
                    for n in names[:10]:
                        print(f'    {n}')
                    zf.extractall(GEO_DIR / 'glim')
                    print(f'  Extracted to: {GEO_DIR}/glim/')
                except Exception as e:
                    print(f'  Extract error: {e}')
                report['attempts'].append({'source': name, 'url': url, 'status': 'DOWNLOADED', 'size_bytes': len(data)})
                downloaded = True
                break
        else:
            report['attempts'].append({'source': name, 'url': url, 'status': f'HTTP_{status}'})
    except Exception as e:
        err = str(e)[:80]
        print(f'  Error: {err}')
        report['attempts'].append({'source': name, 'url': url, 'status': f'ERROR: {err}'})

if not downloaded:
    print('\nGLIM not downloadable from tested sources.')
    print('Creating provenance record...')
    prov = {
        'dataset': 'GLIM Global Lithological Map',
        'authors': 'Hartmann & Moosdorf 2012',
        'doi': '10.1029/2012GC004370',
        'manual_download': 'https://www.geo.uni-hamburg.de/geologie/forschung/geochemie/litholmod.html',
        'zenodo': 'https://zenodo.org/record/3897899',
        'status': 'REQUIRES_MANUAL_DOWNLOAD',
        'interim': 'Use SoilGrids WRB soil classification at data/raw/geology/soilgrids_wrb_ner.tif as geology proxy',
        'columns_of_interest': ['xx', 'gg'],  # GLIM lithology codes
        'note': 'GLIM provides 16 lithological classes useful as ML features for landslide susceptibility'
    }
    with open(GEO_DIR / 'glim_provenance.json', 'w') as f:
        json.dump(prov, f, indent=2)
    report['attempts'].append({'source': 'GLIM provenance', 'status': 'DOCUMENTED'})

report['status'] = 'DOWNLOADED' if downloaded else 'BLOCKED_WITH_PROXY'
with open(GEO_DIR / 'glim_download_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print(f'\nFinal status: {report["status"]}')
