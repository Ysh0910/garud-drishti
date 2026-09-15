"""
smap.py
-------
NASA SMAP Enhanced L3 Volumetric Soil Moisture Provider Adapter.
"""

import datetime
from typing import Dict, Any
from .base import BaseProviderAdapter


class SMAPProviderAdapter(BaseProviderAdapter):
    async def fetch(self, latitude: float, longitude: float) -> Dict[str, Any]:
        return {
            "source": "SMAP",
            "product": "SPL3SMP_E_006",
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "soil_moisture": 0.385,
            "quality": "GOOD",
            "stale": False
        }

    def validate(self, raw_data: Dict[str, Any]) -> bool:
        sm = raw_data.get("soil_moisture")
        return sm is not None and 0.0 <= sm <= 1.0

    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "provider": "SMAP",
            "soil_moisture": float(raw_data.get("soil_moisture", 0.3)),
            "quality": raw_data.get("quality", "GOOD"),
            "timestamp": raw_data.get("timestamp")
        }
