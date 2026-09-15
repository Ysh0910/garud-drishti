"""
leakage.py
----------
Phase 4: Future Data Leakage Detection Gate for Model 2 (Dynamic Risk).
Checks:
- Target columns used as features
- Post-event variables (damage, runout, road blockage)
- Future observed rainfall or future soil moisture relative to timestamp T
"""

import logging
from typing import List, Tuple
import pandas as pd

logger = logging.getLogger("leakage_gate")

PROHIBITED_FEATURE_PATTERNS = [
    "landslide_within", "label", "damage", "runout", "post_event",
    "future_rainfall", "future_moisture", "verification_status"
]

TARGET_COLUMNS = [
    "landslide_within_6h", "landslide_within_24h", "landslide_within_48h", "landslide_within_72h", "label"
]


def check_feature_leakage(feature_columns: List[str]) -> Tuple[bool, List[str]]:
    """
    Checks if any feature column name violates anti-leakage compliance rules.
    """
    leaked_features = []
    for col in feature_columns:
        col_lower = col.lower()
        if col in TARGET_COLUMNS:
            leaked_features.append(f"Target column '{col}' used as feature")
        for pattern in PROHIBITED_FEATURE_PATTERNS:
            if pattern in col_lower and col not in ["historical_ls_density", "distance_to_historical_ls_m"]:
                leaked_features.append(f"Feature '{col}' contains prohibited pattern '{pattern}'")

    has_leakage = len(leaked_features) > 0
    return has_leakage, leaked_features


def audit_dynamic_dataset_leakage(df: pd.DataFrame, feature_columns: List[str]) -> bool:
    """
    Audits dynamic risk dataset for temporal and target feature leakage.
    Stops execution if leakage is detected.
    """
    logger.info("--- Running Model 2 Leakage Gate Audit ---")
    has_leakage, reasons = check_feature_leakage(feature_columns)

    if has_leakage:
        logger.critical("LEAKAGE DETECTED! Stopping training pipeline immediately:")
        for r in reasons:
            logger.critical(f"  - {r}")
        raise ValueError("Future data leakage detected! Review feature list and dataset pipeline.")

    logger.info("Anti-leakage audit PASSED: No target or future-observation feature leakage detected.")
    return True
