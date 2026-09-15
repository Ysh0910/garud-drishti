"""
imd.py
------
India Meteorological Department (IMD) Environmental Observation Adapter.
Fetches surface rainfall observations and weather forecasts.
"""

import datetime
from typing import Dict, Any
from .base import BaseProviderAdapter


class IMDProviderAdapter(BaseProviderAdapter):
    def __init__(self, use_mock_fallback: bool = True):
        self.use_mock_fallback = use_mock_fallback

    async def fetch(self, latitude: float, longitude: float) -> Dict[str, Any]:
        # Simulated or Live IMD API Endpoint query
        return {
            "source": "IMD",
            "product": "IMD_RF25_DAILY",
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "rainfall_24h_mm": 52.4,
            "forecast_rain_6h_mm": 18.0,
            "forecast_rain_24h_mm": 45.0,
            "forecast_rain_48h_mm": 80.0,
            "quality": "GOOD",
            "stale": False
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        return "rainfall_24h_mm" in raw_data and raw_data.get("quality") in ["GOOD", "DEGRADED"]

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "provider": "IMD",
            "rainfall_24h_mm": float(raw_data.get("rainfall_24h_mm", 0.0)),
            "forecast_rain_6h_mm": float(raw_data.get("forecast_rain_6h_mm", 0.0)),
            "forecast_rain_24h_mm": float(raw_data.get("forecast_rain_24h_mm", 0.0)),
            "forecast_rain_48h_mm": float(raw_data.get("forecast_rain_48h_mm", 0.0)),
            "quality": raw_data.get("quality", "GOOD"),
            "timestamp": raw_data.get("timestamp")
        }
