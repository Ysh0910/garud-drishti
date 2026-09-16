"""
ml/ingestion/providers/mock_provider.py
---------------------------------------
Resilient Simulation Provider for GARUD DRISHTI.
Generates realistic, physically consistent NER meteorological and terrain observations
for testing, air-gapped demo deployments, and automatic degraded fallback.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import math

from ml.ingestion.providers.base import BaseProvider, NormalizedObservation, DataQualityState

# Pilot study area reference nodes across NER India
PILOT_NODES = [
    {"name": "Gangtok", "lat": 27.3389, "lon": 88.6065, "state": "Sikkim", "base_rain_24h": 112.5, "soil_moisture": 0.44},
    {"name": "Shillong", "lat": 25.5788, "lon": 91.8933, "state": "Meghalaya", "base_rain_24h": 98.0, "soil_moisture": 0.38},
    {"name": "Mawkdok", "lat": 25.6185, "lon": 91.8792, "state": "Meghalaya", "base_rain_24h": 145.0, "soil_moisture": 0.48},
    {"name": "Aizawl", "lat": 23.7271, "lon": 92.7176, "state": "Mizoram", "base_rain_24h": 85.0, "soil_moisture": 0.35},
    {"name": "Guwahati", "lat": 26.1445, "lon": 91.7362, "state": "Assam", "base_rain_24h": 42.0, "soil_moisture": 0.28},
    {"name": "Kohima", "lat": 25.6751, "lon": 94.1086, "state": "Nagaland", "base_rain_24h": 76.0, "soil_moisture": 0.36},
    {"name": "Itanagar", "lat": 27.0844, "lon": 93.6053, "state": "Arunachal Pradesh", "base_rain_24h": 88.0, "soil_moisture": 0.40},
]


class MockProvider(BaseProvider):
    """
    Simulation Provider delivering deterministic environmental telemetry.
    """
    def __init__(self, simulation_mode: str = "monsoon_surge"):
        super().__init__(provider_name="MOCK_SIMULATION", timeout_seconds=1.0, max_retries=1)
        self.simulation_mode = simulation_mode

    def is_healthy(self) -> bool:
        return True

    def get_point_observation(
        self,
        latitude: float,
        longitude: float,
        variable: str = "rainfall_24h_mm",
        target_time: Optional[datetime] = None
    ) -> NormalizedObservation:
        observed_at = (target_time or datetime.now(timezone.utc)).isoformat()

        # Find closest pilot corridor node
        closest_node = min(
            PILOT_NODES,
            key=lambda n: (n["lat"] - latitude) ** 2 + (n["lon"] - longitude) ** 2
        )
        dist = math.hypot(closest_node["lat"] - latitude, closest_node["lon"] - longitude)

        # Compute variable value based on requested environmental feature
        if "1h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 0.08 + math.sin(latitude * 10) * 2.0), 2)
            unit = "mm"
        elif "3h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 0.22 + math.sin(latitude * 10) * 4.0), 2)
            unit = "mm"
        elif "6h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 0.40 + math.cos(longitude * 10) * 6.0), 2)
            unit = "mm"
        elif "12h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 0.65), 2)
            unit = "mm"
        elif "24h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * max(0.4, 1.0 - dist * 0.3)), 2)
            unit = "mm"
        elif "72h" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 1.85), 2)
            unit = "mm"
        elif "7d" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 2.60), 2)
            unit = "mm"
        elif "soil_moisture" in variable:
            val = round(min(0.65, max(0.10, closest_node["soil_moisture"] + math.sin(latitude) * 0.02)), 3)
            unit = "m3/m3"
        elif "forecast" in variable:
            val = round(max(0.0, closest_node["base_rain_24h"] * 0.75), 2)
            unit = "mm"
        else:
            val = 10.0
            unit = "raw"

        self._last_successful_fetch = datetime.now(timezone.utc)
        return NormalizedObservation(
            source="MOCK_SIMULATION",
            variable=variable,
            timestamp=observed_at,
            latitude=latitude,
            longitude=longitude,
            value=val,
            unit=unit,
            quality=DataQualityState.GOOD,
            stale=False,
            provider_product=f"MOCK_{self.simulation_mode.upper()}",
            metadata={"nearest_node": closest_node["name"], "state": closest_node["state"]}
        )

    def fetch_observations(
        self,
        bbox: Optional[Dict[str, float]] = None,
        target_time: Optional[datetime] = None
    ) -> List[NormalizedObservation]:
        if bbox is None:
            bbox = {"min_lon": 88.0, "min_lat": 26.5, "max_lon": 89.5, "max_lat": 28.0}

        observations: List[NormalizedObservation] = []
        step = 0.25

        curr_lat = bbox["min_lat"]
        while curr_lat <= bbox["max_lat"]:
            curr_lon = bbox["min_lon"]
            while curr_lon <= bbox["max_lon"]:
                obs = self.get_point_observation(curr_lat, curr_lon, variable="rainfall_24h_mm", target_time=target_time)
                observations.append(obs)
                curr_lon += step
            curr_lat += step

        self._last_successful_fetch = datetime.now(timezone.utc)
        return observations
