"""
ml/ingestion/observation_store.py
---------------------------------
In-memory and file-backed storage for time-series environmental observations.
Supports rolling aggregation queries and fast spatial lookup.
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone, timedelta
from ml.ingestion.providers.base import NormalizedObservation


class ObservationStore:
    """
    Time-series repository for point and gridded physical observations.
    Indexed by spatial coordinate bucket and observation timestamp.
    """
    def __init__(self, retention_days: int = 14):
        self.retention_days = retention_days
        # Storage: Dict[(round_lat, round_lon, variable), List[NormalizedObservation]]
        self._store: Dict[Tuple[float, float, str], List[NormalizedObservation]] = {}

    def _coord_key(self, lat: float, lon: float, variable: str) -> Tuple[float, float, str]:
        return (round(lat, 2), round(lon, 2), variable)

    def record_observation(self, obs: NormalizedObservation) -> None:
        """
        Appends new observation to time-series bucket, maintaining chronological sorting.
        """
        key = self._coord_key(obs.latitude, obs.longitude, obs.variable)
        if key not in self._store:
            self._store[key] = []

        self._store[key].append(obs)
        # Sort by timestamp
        self._store[key].sort(key=lambda x: x.timestamp)
        self._prune(key)

    def record_batch(self, observations: List[NormalizedObservation]) -> None:
        for obs in observations:
            self.record_observation(obs)

    def get_latest_observation(
        self,
        lat: float,
        lon: float,
        variable: str,
        before_time: Optional[datetime] = None
    ) -> Optional[NormalizedObservation]:
        """
        Finds the most recent valid observation strictly at or before `before_time`.
        """
        key = self._coord_key(lat, lon, variable)
        series = self._store.get(key, [])
        if not series:
            return None

        cutoff = before_time or datetime.now(timezone.utc)
        cutoff_iso = cutoff.isoformat()

        valid = [obs for obs in series if obs.timestamp <= cutoff_iso]
        return valid[-1] if valid else None

    def get_history_series(
        self,
        lat: float,
        lon: float,
        variable: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[NormalizedObservation]:
        """
        Retrieves ordered time-series within [start_time, end_time].
        """
        key = self._coord_key(lat, lon, variable)
        series = self._store.get(key, [])
        start_iso = start_time.isoformat()
        end_iso = end_time.isoformat()

        return [
            obs for obs in series
            if start_iso <= obs.timestamp <= end_iso
        ]

    def _prune(self, key: Tuple[float, float, str]) -> None:
        """Removes records older than retention window."""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)
        cutoff_iso = cutoff_date.isoformat()
        self._store[key] = [obs for obs in self._store[key] if obs.timestamp >= cutoff_iso]

    def clear(self) -> None:
        self._store.clear()


# Global in-memory singleton instance
observation_store = ObservationStore()
