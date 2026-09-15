import requests

token_url = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
data = {
    'client_id': 'cdse-public',
    'username': 'tejasvijavagal@gmail.com',
    'password': 'K88KBfEcz+?#guG',
    'grant_type': 'password'
}
token = requests.post(token_url, data=data).json()['access_token']

pid = '5afd8f46-dce3-4888-a237-f374791a3b8f'

class AuthSession(requests.Session):
    def rebuild_auth(self, prepared_request, response):
        prepared_request.headers['Authorization'] = 'Bearer ' + token

session = AuthSession()
url = f'https://catalogue.dataspace.copernicus.eu/odata/v1/Products({pid})/$value'
r = session.get(url, stream=True, allow_redirects=True)
print('Status code:', r.status_code)
print('Content-Type:', r.headers.get('Content-Type'))
print('Content-Length:', r.headers.get('Content-Length'))
if r.status_code == 200:
    print('SUCCESS! Verified direct authenticated product stream.')
else:
    print('Error content:', r.text[:300])
