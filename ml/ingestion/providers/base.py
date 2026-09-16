"""
ml/ingestion/providers/base.py
------------------------------
Base abstract provider interface for GARUD DRISHTI Data Ingestion Layer.
Strictly adheres to AGENTS.md §34 (Provider Abstraction) and contracts/risk.md.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from enum import Enum


class DataQualityState(str, Enum):
    GOOD = "GOOD"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    MISSING = "MISSING"


class NormalizedObservation(BaseModel):
    """
    Standardized physical environmental observation record.
    Traceable to source, timestamp, coordinates, units, and quality state.
    """
    source: str
    variable: str  # e.g., 'rainfall_mm', 'soil_moisture', 'landcover', 'elevation_m'
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    latitude: float
    longitude: float
    value: float
    unit: str
    quality: DataQualityState = DataQualityState.GOOD
    stale: bool = False
    provider_product: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseProvider(ABC):
    """
    Abstract interface required for all external and simulation data providers.
    Supports timeouts, retries, quality scoring, and error handling.
    """
    def __init__(self, provider_name: str, timeout_seconds: float = 10.0, max_retries: int = 3):
        self.provider_name = provider_name
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self._last_successful_fetch: Optional[datetime] = None

    @abstractmethod
    def fetch_observations(
        self,
        bbox: Optional[Dict[str, float]] = None,
        target_time: Optional[datetime] = None
    ) -> List[NormalizedObservation]:
        """
        Fetches regional batch observations for a bounding box at a target timestamp.
        bbox format: {'min_lon': float, 'min_lat': float, 'max_lon': float, 'max_lat': float}
        """
        pass

    @abstractmethod
    def get_point_observation(
        self,
        latitude: float,
        longitude: float,
        variable: str,
        target_time: Optional[datetime] = None
    ) -> NormalizedObservation:
        """
        Retrieves point observation at exact spatial coordinate.
        """
        pass

    @abstractmethod
    def is_healthy(self) -> bool:
        """
        Checks operational status of the provider.
        """
        pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": self.provider_name,
            "healthy": self.is_healthy(),
            "last_successful_fetch": self._last_successful_fetch.isoformat() if self._last_successful_fetch else None,
            "timeout_seconds": self.timeout_seconds,
        }
