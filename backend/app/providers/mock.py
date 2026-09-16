from .base import BaseProviderAdapter

class MockDataProvider(BaseProviderAdapter):
    """Mock provider for development/testing when external credentials/APIs are unavailable."""
    async def fetch(self, latitude: float, longitude: float):
        return {
            "source": "MockDataProvider",
            "rainfall_1h_mm": 5.0,
            "rainfall_3h_mm": 15.0,
            "rainfall_6h_mm": 35.0,
            "rainfall_12h_mm": 60.0,
            "rainfall_24h_mm": 95.0,
            "rainfall_72h_mm": 150.0,
            "rainfall_7d_mm": 220.0,
            "soil_moisture": 0.35,
            "forecast_rain_6h_mm": 20.0,
            "forecast_rain_24h_mm": 50.0,
            "forecast_rain_48h_mm": 85.0,
            "stale": False,
            "quality": "GOOD"
        }

    async def fetch_latest(self, latitude: float, longitude: float):
        return await self.fetch(latitude, longitude)

    def validate(self, raw_data):
        return True

    def normalize(self, raw_data):
        return raw_data

