from .mock import BaseProviderAdapter

class GPMProviderAdapter(BaseProviderAdapter):
    """NASA GPM IMERG Precipitation provider adapter."""
    async def fetch_latest(self, latitude: float, longitude: float):
        return {"source": "NASA_GPM", "status": "initialized"}
