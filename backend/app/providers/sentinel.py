"""
sentinel.py
-----------
Copernicus Data Space Sentinel-1/Sentinel-2 Provider Adapter.
"""

import datetime
from typing import Dict, Any
from .base import BaseProviderAdapter


class SentinelProviderAdapter(BaseProviderAdapter):
    async def fetch(self, latitude: float, longitude: float) -> Dict[str, Any]:
        return {
            "source": "Sentinel",
            "product": "Sentinel-1_GRD / Sentinel-2_L2A",
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "satellite_change_score": 0.0,
            "quality": "CATALOG_ONLY",
            "stale": False
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        return "satellite_change_score" in raw_data

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "provider": "Sentinel",
            "satellite_change_score": float(raw_data.get("satellite_change_score", 0.0)),
            "quality": raw_data.get("quality", "CATALOG_ONLY"),
            "timestamp": raw_data.get("timestamp")
        }
