from .mock import BaseProviderAdapter

class IMDProviderAdapter(BaseProviderAdapter):
    """India Meteorological Department (IMD) API adapter."""
    async def fetch_latest(self, latitude: float, longitude: float):
        # Implementation placeholder
        return {"source": "IMD", "status": "initialized"}
