"""
test_leakage.py
---------------
Unit tests for anti-leakage detection gate.
"""

import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from ml.preprocessing.leakage import check_feature_leakage


def test_leakage_detection():
    # Valid feature list
    valid_features = [
        "base_susceptibility", "rainfall_24h_mm", "soil_moisture",
        "historical_ls_density", "distance_to_historical_ls_m"
    ]
    has_leakage, reasons = check_feature_leakage(valid_features)
    assert not has_leakage, f"Valid features flagged incorrectly: {reasons}"

    # Invalid feature list with target variable
    leaked_features = [
        "base_susceptibility", "rainfall_24h_mm", "landslide_within_24h"
    ]
    has_leakage_2, reasons_2 = check_feature_leakage(leaked_features)
    assert has_leakage_2, "Target variable leakage was not caught!"
    print("test_leakage_detection: PASSED")


if __name__ == "__main__":
    test_leakage_detection()
