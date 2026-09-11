class BaseProviderAdapter:
    """Base interface for external data providers."""
    async def fetch_latest(self, latitude: float, longitude: float):
        raise NotImplementedError

class MockDataProvider(BaseProviderAdapter):
    """Mock provider for development/testing when external credentials/APIs are unavailable."""
    async def fetch_latest(self, latitude: float, longitude: float):
        return {
            "source": "MockDataProvider",
            "rainfall_24h_mm": 45.2,
            "soil_moisture": 0.35,
            "stale": False,
            "quality": "valid"
        }
