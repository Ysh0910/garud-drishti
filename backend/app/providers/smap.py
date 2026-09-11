from .mock import BaseProviderAdapter

class SMAPProviderAdapter(BaseProviderAdapter):
    """NASA SMAP Soil Moisture provider adapter."""
    async def fetch_latest(self, latitude: float, longitude: float):
        return {"source": "NASA_SMAP", "status": "initialized"}
