"""Inspect GPM manifests and attempt downloading a representative subset."""
import re, json, requests, os
from pathlib import Path
from datetime import datetime, timezone

RAW_DIR = Path('data/raw')
GPM_DAILY_DIR = RAW_DIR / 'rainfall' / 'gpm' / 'daily'
GPM_HH_DIR = RAW_DIR / 'rainfall' / 'gpm' / 'half_hourly'
GPM_DAILY_DIR.mkdir(parents=True, exist_ok=True)
GPM_HH_DIR.mkdir(parents=True, exist_ok=True)

daily_txt = RAW_DIR / 'subset_GPM_3IMERGDF_07_20260911_085145_.txt'
hh_txt = RAW_DIR / 'subset_GPM_3IMERGHH_07_20260911_094301_.txt'

def parse_manifest(txt_path):
    lines = txt_path.read_text(encoding='utf-8', errors='replace').strip().split('\n')
    urls = [l.strip() for l in lines if l.strip().startswith('http')]
    data_urls = [u for u in urls if not any(k in u.lower() for k in ['pdf', 'readme', 'doc', '.txt'])]
    return data_urls

# --- Parse manifests ---
daily_urls = parse_manifest(daily_txt)
hh_urls = parse_manifest(hh_txt)

daily_dates = sorted(set(re.findall(r'20\d{6}', ' '.join(daily_urls))))
hh_dates = sorted(set(re.findall(r'20\d{6}', ' '.join(hh_urls))))

print('GPM Daily manifest:')
print(f'  Total data URLs: {len(daily_urls)}')
print(f'  Date range: {daily_dates[0] if daily_dates else "?"} to {daily_dates[-1] if daily_dates else "?"}')
print(f'  Sample URL: {daily_urls[0] if daily_urls else "none"}')

print('\nGPM Half-Hourly manifest:')
print(f'  Total data URLs: {len(hh_urls)}')
print(f'  Date range: {hh_dates[0] if hh_dates else "?"} to {hh_dates[-1] if hh_dates else "?"}')
print(f'  Sample URL: {hh_urls[0] if hh_urls else "none"}')

# --- Write manifest summary ---
summary = {
    'generated_at': datetime.now(timezone.utc).isoformat(),
    'daily': {
        'manifest_file': str(daily_txt),
        'data_urls': len(daily_urls),
        'date_range': {'start': daily_dates[0] if daily_dates else None, 'end': daily_dates[-1] if daily_dates else None},
        'sample_url': daily_urls[0] if daily_urls else None,
        'status': 'MANIFEST_PRESENT'
    },
    'half_hourly': {
        'manifest_file': str(hh_txt),
        'data_urls': len(hh_urls),
        'date_range': {'start': hh_dates[0] if hh_dates else None, 'end': hh_dates[-1] if hh_dates else None},
        'sample_url': hh_urls[0] if hh_urls else None,
        'status': 'MANIFEST_PRESENT'
    }
}

# --- Attempt downloads using Earthdata credentials ---
earthdata_user = os.environ.get('EARTHDATA_USER', '')
earthdata_pass = os.environ.get('EARTHDATA_PASSWORD', '')

if not earthdata_user:
    print('\nEARTHDATA_USER not set — GPM downloads require NASA Earthdata credentials.')
    print('Set env vars: EARTHDATA_USER and EARTHDATA_PASSWORD')
    print('Register at: https://urs.earthdata.nasa.gov/')
    summary['daily']['status'] = 'BLOCKED_AUTH_REQUIRED'
    summary['half_hourly']['status'] = 'BLOCKED_AUTH_REQUIRED'
    summary['auth_note'] = 'NASA Earthdata login required. Set EARTHDATA_USER and EARTHDATA_PASSWORD.'
else:
    # Attempt to download a few daily files as a test
    print(f'\nAttempting GPM daily download with user: {earthdata_user}')
    session = requests.Session()
    session.auth = (earthdata_user, earthdata_pass)
    
    downloaded = 0
    errors = 0
    for url in daily_urls[:5]:  # Test first 5
        fname = Path(url.split('/')[-1].split('?')[0])
        out = GPM_DAILY_DIR / fname
        if out.exists():
            print(f'  SKIP: {fname.name}')
            downloaded += 1
            continue
        try:
            r = session.get(url, timeout=60, allow_redirects=True)
            if r.status_code == 200:
                out.write_bytes(r.content)
                print(f'  OK: {fname.name} ({len(r.content)//1024}KB)')
                downloaded += 1
            else:
                print(f'  HTTP {r.status_code}: {fname.name}')
                errors += 1
        except Exception as e:
            print(f'  ERR: {e}')
            errors += 1
    
    summary['daily']['test_download'] = {'attempted': 5, 'downloaded': downloaded, 'errors': errors}

# Save download manifest CSVs
with open(GPM_DAILY_DIR / 'download_manifest_used.csv', 'w', encoding='utf-8') as f:
    f.write('url,filename,status\n')
    for url in daily_urls:
        fname = url.split('/')[-1].split('?')[0]
        out = GPM_DAILY_DIR / fname
        status = 'PRESENT' if out.exists() else 'NOT_DOWNLOADED'
        f.write(f'{url},{fname},{status}\n')

with open(GPM_DAILY_DIR / 'download_report.json', 'w') as f:
    json.dump(summary, f, indent=2)

print(f'\nGPM manifest summary saved.')
print(f'Download report: {GPM_DAILY_DIR}/download_report.json')
