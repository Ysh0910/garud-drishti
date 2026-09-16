import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.ingestion.providers.base import NormalizedObservation, DataQualityState
from ml.ingestion.qc import QualityControlEngine


def test_qc_range_validation():
    # Valid observation
    valid_obs = NormalizedObservation(
        source="IMD",
        variable="rainfall_24h_mm",
        latitude=27.33,
        longitude=88.61,
        value=120.0,
        unit="mm"
    )
    res = QualityControlEngine.validate_observation(valid_obs)
    assert res.quality == DataQualityState.GOOD
    assert res.value == 120.0

    # Out of range observation (e.g., negative rainfall)
    invalid_obs = NormalizedObservation(
        source="IMD",
        variable="rainfall_24h_mm",
        latitude=27.33,
        longitude=88.61,
        value=-15.0,
        unit="mm"
    )
    res_inv = QualityControlEngine.validate_observation(invalid_obs)
    assert res_inv.quality == DataQualityState.DEGRADED
    assert res_inv.value == 0.0  # Clamped to minimum physical limit


def test_qc_freshness_and_staleness():
    now = datetime.now(timezone.utc)

    # 1. Fresh observation (30 mins old -> GOOD)
    fresh_time = (now - timedelta(minutes=30)).isoformat()
    fresh_obs = NormalizedObservation(
        source="NASA_GPM",
        variable="rainfall_1h_mm",
        timestamp=fresh_time,
        latitude=27.33,
        longitude=88.61,
        value=15.0,
        unit="mm"
    )
    res_fresh = QualityControlEngine.validate_observation(fresh_obs, reference_time=now)
    assert res_fresh.quality == DataQualityState.GOOD
    assert res_fresh.stale is False

    # 2. Degraded observation (5 hours old -> DEGRADED)
    degraded_time = (now - timedelta(hours=5)).isoformat()
    degraded_obs = NormalizedObservation(
        source="NASA_GPM",
        variable="rainfall_1h_mm",
        timestamp=degraded_time,
        latitude=27.33,
        longitude=88.61,
        value=15.0,
        unit="mm"
    )
    res_deg = QualityControlEngine.validate_observation(degraded_obs, reference_time=now)
    assert res_deg.quality == DataQualityState.DEGRADED
    assert res_deg.stale is True

    # 3. Stale observation (20 hours old -> STALE)
    stale_time = (now - timedelta(hours=20)).isoformat()
    stale_obs = NormalizedObservation(
        source="NASA_GPM",
        variable="rainfall_1h_mm",
        timestamp=stale_time,
        latitude=27.33,
        longitude=88.61,
        value=15.0,
        unit="mm"
    )
    res_stale = QualityControlEngine.validate_observation(stale_obs, reference_time=now)
    assert res_stale.quality == DataQualityState.STALE
    assert res_stale.stale is True


def test_composite_quality_calculation():
    obs_map = {
        "rain": NormalizedObservation(source="IMD", variable="rainfall_24h_mm", latitude=27.33, longitude=88.61, value=50.0, unit="mm", quality=DataQualityState.GOOD),
        "soil": NormalizedObservation(source="SMAP", variable="soil_moisture", latitude=27.33, longitude=88.61, value=0.35, unit="m3/m3", quality=DataQualityState.GOOD),
    }
    assert QualityControlEngine.compute_composite_quality(obs_map) == DataQualityState.GOOD

    obs_map["rain"].quality = DataQualityState.DEGRADED
    assert QualityControlEngine.compute_composite_quality(obs_map) == DataQualityState.DEGRADED


if __name__ == "__main__":
    test_qc_range_validation()
    test_qc_freshness_and_staleness()
    test_composite_quality_calculation()
    print("All QC tests passed successfully!")
