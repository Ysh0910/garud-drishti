import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.ingestion.providers.base import DataQualityState
from ml.ingestion.providers.imd_provider import IMDProvider
from ml.ingestion.providers.gpm_provider import GPMProvider
from ml.ingestion.providers.smap_provider import SMAPProvider
from ml.ingestion.providers.sentinel_provider import SentinelProvider
from ml.ingestion.providers.mock_provider import MockProvider


def test_mock_provider_point_and_bbox():
    provider = MockProvider()
    assert provider.is_healthy() is True

    # Test point observation in Gangtok (27.3389, 88.6065)
    obs = provider.get_point_observation(27.3389, 88.6065, variable="rainfall_24h_mm")
    assert obs.source == "MOCK_SIMULATION"
    assert obs.variable == "rainfall_24h_mm"
    assert obs.value > 0.0
    assert obs.unit == "mm"
    assert obs.quality == DataQualityState.GOOD
    assert obs.stale is False

    # Test BBox fetch
    bbox = {"min_lon": 88.0, "min_lat": 27.0, "max_lon": 89.0, "max_lat": 28.0}
    observations = provider.fetch_observations(bbox)
    assert len(observations) > 0
    assert all(o.value >= 0.0 for o in observations)


def test_imd_provider():
    provider = IMDProvider()
    # Test valid point query in Sikkim
    obs = provider.get_point_observation(27.3389, 88.6065, variable="rainfall_24h_mm")
    assert obs.source == "IMD"
    assert obs.value >= 0.0
    assert obs.unit == "mm"
    assert obs.quality in [DataQualityState.GOOD, DataQualityState.DEGRADED]

    # Test out of bounds coordinate
    oob_obs = provider.get_point_observation(5.0, 50.0, variable="rainfall_24h_mm")
    assert oob_obs.quality == DataQualityState.DEGRADED
    assert oob_obs.stale is True


def test_gpm_and_smap_providers():
    gpm = GPMProvider()
    smap = SMAPProvider()

    gpm_obs = gpm.get_point_observation(25.5788, 91.8933, variable="rainfall_1h_mm")
    assert gpm_obs.source == "NASA_GPM"
    assert gpm_obs.value >= 0.0

    smap_obs = smap.get_point_observation(25.5788, 91.8933, variable="soil_moisture")
    assert smap_obs.source == "NASA_SMAP"
    assert 0.0 <= smap_obs.value <= 1.0
    assert smap_obs.unit == "m3/m3"


def test_sentinel_provider():
    sentinel = SentinelProvider()
    obs = sentinel.get_point_observation(27.3389, 88.6065, variable="surface_disturbance_score")
    assert obs.source == "Copernicus_Sentinel"
    assert 0.0 <= obs.value <= 1.0


if __name__ == "__main__":
    test_mock_provider_point_and_bbox()
    test_imd_provider()
    test_gpm_and_smap_providers()
    test_sentinel_provider()
    print("All provider tests passed successfully!")
