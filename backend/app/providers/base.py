"""
base.py
-------
Base Provider Adapter Interface for GARUD DRISHTI Environmental Data Ingestion Layer.
Defines fetch(), validate(), normalize(), and metadata() contracts.
"""

from abc import ABC, abstractmethod
import datetime
from typing import Dict, Any, Optional


class BaseProviderAdapter(ABC):
    """
    Abstract Base Class for environmental data providers (IMD, GPM, SMAP, Sentinel, Mock).
    """

    @abstractmethod
    async def fetch(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Fetch raw observation data from the provider."""
        pass

    @abstractmethod
    def validate(self, raw_data: Dict[str, Any]) -> bool:
        """Validates payload schema, value ranges, and non-null constraints."""
        pass

    @abstractmethod
    def normalize(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes raw payload into canonical observation schema."""
        pass

    def metadata(self) -> Dict[str, Any]:
        """Returns provider metadata, product version, and coverage parameters."""
        return {
            "provider_name": self.__class__.__name__,
            "status": "ACTIVE"
        }
