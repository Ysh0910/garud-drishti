import requests
import json

token_url = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
data = {
    'client_id': 'cdse-public',
    'username': 'tejasvijavagal@gmail.com',
    'password': 'K88KBfEcz+?#guG',
    'grant_type': 'password'
}
token = requests.post(token_url, data=data).json()['access_token']
headers = {'Authorization': 'Bearer ' + token}

# Find Product ID using STAC first
query_s2 = {
    'collections': ['sentinel-2-l2a'],
    'bbox': [91.0, 24.5, 94.0, 27.5],
    'datetime': '2024-01-01T00:00:00Z/2024-01-15T23:59:59Z',
    'query': {'eo:cloud_cover': {'lte': 10}},
    'limit': 1
}
res = requests.post('https://stac.dataspace.copernicus.eu/v1/search', json=query_s2).json()
item = res['features'][0]
prod_name = item['id']
print('Found item in STAC:', prod_name)

# Now query OData by Name
params = {
    '$filter': f"Name eq '{prod_name}.SAFE'",
    '$top': 1
}
odata_res = requests.get('https://catalogue.dataspace.copernicus.eu/odata/v1/Products', params=params, headers=headers).json()
if 'value' in odata_res and len(odata_res['value']) > 0:
    prod_obj = odata_res['value'][0]
    pid = prod_obj['Id']
    print(f"OData Product ID: {pid}, Name: {prod_obj['Name']}, Size: {prod_obj['ContentLength'] / 1024 / 1024:.2f} MB")
    
    # Check Nodes
    nodes_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({pid})/Nodes"
    n_resp = requests.get(nodes_url, headers=headers).json()
    print("Top nodes:", [n['Name'] for n in n_resp.get('value', [])])
    
    # Check $value direct download
    val_url = f"https://catalogue.dataspace.copernicus.eu/odata/v1/Products({pid})/$value"
    v_resp = requests.get(val_url, headers=headers, stream=True)
    print(f"$value Status: {v_resp.status_code}, Length: {v_resp.headers.get('Content-Length')} bytes, Type: {v_resp.headers.get('Content-Type')}")
else:
    print("OData search returned:", odata_res)
