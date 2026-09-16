import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.feature_engineering.rolling_windows import RollingWindowAggregator
from ml.feature_engineering.terrain_extractor import TerrainFeatureExtractor
from ml.feature_engineering.feature_store import feature_store
from ml.ingestion.observation_store import ObservationStore
from ml.ingestion.providers.base import NormalizedObservation, DataQualityState


def test_rolling_windows_no_lookahead():
    store = ObservationStore()
    now = datetime(2026, 9, 16, 12, 0, 0, tzinfo=timezone.utc)

    # Insert 3 past observations: 10h ago (20mm), 4h ago (30mm), 30min ago (15mm)
    store.record_observation(NormalizedObservation(
        source="AWS", variable="rainfall_mm", timestamp=(now - timedelta(hours=10)).isoformat(),
        latitude=27.33, longitude=88.61, value=20.0, unit="mm"
    ))
    store.record_observation(NormalizedObservation(
        source="AWS", variable="rainfall_mm", timestamp=(now - timedelta(hours=4)).isoformat(),
        latitude=27.33, longitude=88.61, value=30.0, unit="mm"
    ))
    store.record_observation(NormalizedObservation(
        source="AWS", variable="rainfall_mm", timestamp=(now - timedelta(minutes=30)).isoformat(),
        latitude=27.33, longitude=88.61, value=15.0, unit="mm"
    ))

    # Insert a future observation (3 hours in the future) - must NOT be included
    store.record_observation(NormalizedObservation(
        source="AWS", variable="rainfall_mm", timestamp=(now + timedelta(hours=3)).isoformat(),
        latitude=27.33, longitude=88.61, value=100.0, unit="mm"
    ))

    windows = RollingWindowAggregator.calculate_rolling_windows(27.33, 88.61, prediction_time=now, store=store)

    assert windows["rainfall_1h_mm"] == 15.0      # Only 30m ago (15mm)
    assert windows["rainfall_6h_mm"] == 45.0      # 30m ago (15mm) + 4h ago (30mm)
    assert windows["rainfall_12h_mm"] == 65.0     # 30m + 4h + 10h (15+30+20)
    assert windows["rainfall_24h_mm"] == 65.0     # Same as 12h
    # Total sum does NOT include future 100mm
    assert windows["rainfall_7d_mm"] == 65.0


def test_terrain_feature_extraction():
    # Gangtok, Sikkim (27.3389, 88.6065)
    terrain = TerrainFeatureExtractor.extract_static_features(27.3389, 88.6065)
    assert terrain["state"] == "Sikkim"
    assert terrain["elevation_m"] > 1000.0
    assert terrain["slope_deg"] > 15.0
    assert "geology" in terrain
    assert "geomorphology" in terrain
    assert terrain["distance_to_drainage_m"] > 0


def test_unified_feature_store():
    # 1. Static features DataFrame
    static_df, terrain_meta = feature_store.build_static_features(27.3389, 88.6065)
    assert len(static_df) == 1
    assert "elevation_m" in static_df.columns
    assert "slope_deg" in static_df.columns
    assert "landcover" in static_df.columns

    # 2. Dynamic features DataFrame
    dynamic_df, dyn_meta, quality = feature_store.build_dynamic_features(27.3389, 88.6065, base_susceptibility=75)
    assert len(dynamic_df) == 1
    assert dynamic_df["base_susceptibility"].iloc[0] == 75.0
    assert dynamic_df["rainfall_24h_mm"].iloc[0] > 0.0
    assert 0.0 <= dynamic_df["soil_moisture"].iloc[0] <= 1.0
    assert quality in [DataQualityState.GOOD, DataQualityState.DEGRADED]


if __name__ == "__main__":
    test_rolling_windows_no_lookahead()
    test_terrain_feature_extraction()
    test_unified_feature_store()
    print("All feature engineering tests passed successfully!")
