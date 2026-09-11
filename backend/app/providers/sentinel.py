from .mock import BaseProviderAdapter

class SentinelProviderAdapter(BaseProviderAdapter):
    """Copernicus Sentinel-1 / Sentinel-2 Earth Observation adapter."""
    async def fetch_latest(self, latitude: float, longitude: float):
        return {"source": "Copernicus_Sentinel", "status": "initialized"}
