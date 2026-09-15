"""
observation_schema.py
---------------------
Normalized Environmental Observation Data Structure & Data-Quality States
(GOOD, DEGRADED, STALE, MISSING).
"""

import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class DataQualityState(str, Enum):
    GOOD = "GOOD"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    MISSING = "MISSING"


class NormalizedObservation(BaseModel):
    source: str
    variable: str
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    latitude: float
    longitude: float
    value: float
    unit: str
    quality: DataQualityState = DataQualityState.GOOD
    stale: bool = False
    provider_product: Optional[str] = None
