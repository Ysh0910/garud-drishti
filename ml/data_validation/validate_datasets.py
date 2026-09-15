"""
validate_datasets.py
--------------------
Phase 1: Deterministic dataset validation and versioning for GARUD DRISHTI.
Validates:
- data/final/susceptibility_dataset.csv
- data/final/dynamic_risk_dataset.csv

Generates SHA-256 fingerprints and logs structural metrics.
"""

import hashlib
import json
import logging
from pathlib import Path
import sys
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("validate_datasets")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_FINAL_DIR = PROJECT_ROOT / "data" / "final"
METADATA_DIR = PROJECT_ROOT / "ml" / "reports" / "metadata"

SUSCEPTIBILITY_FILE = DATA_FINAL_DIR / "susceptibility_dataset.csv"
DYNAMIC_RISK_FILE = DATA_FINAL_DIR / "dynamic_risk_dataset.csv"

SUSCEPTIBILITY_COLUMNS = [
    "sample_id", "latitude", "longitude", "state", "district",
    "elevation_m", "slope_deg", "aspect_deg", "curvature",
    "landcover", "geology", "geomorphology", "hydrological_condition",
    "distance_to_drainage_m", "historical_ls_density", "distance_to_historical_ls_m",
    "label"
]

DYNAMIC_RISK_COLUMNS = [
    "sample_id", "latitude", "longitude", "timestamp", "base_susceptibility",
    "rainfall_1h_mm", "rainfall_3h_mm", "rainfall_6h_mm", "rainfall_12h_mm",
    "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_7d_mm", "soil_moisture",
    "forecast_rain_6h_mm", "forecast_rain_24h_mm", "forecast_rain_48h_mm",
    "landslide_within_6h", "landslide_within_24h", "landslide_within_48h", "landslide_within_72h"
]


def calculate_sha256(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


def validate_susceptibility_dataset() -> dict:
    logger.info(f"--- Validating Susceptibility Dataset: {SUSCEPTIBILITY_FILE} ---")
    if not SUSCEPTIBILITY_FILE.exists():
        raise FileNotFoundError(f"Missing susceptibility dataset: {SUSCEPTIBILITY_FILE}")

    df = pd.read_csv(SUSCEPTIBILITY_FILE)
    if df.empty:
        raise ValueError("Susceptibility dataset is empty!")

    # 1. Schema check
    missing_cols = set(SUSCEPTIBILITY_COLUMNS) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Susceptibility dataset missing columns: {missing_cols}")

    # 2. Duplicate columns check
    if len(df.columns) != len(set(df.columns)):
        raise ValueError("Duplicate column names detected in susceptibility dataset")

    # 3. Missing/Infinite values check
    null_counts = df[SUSCEPTIBILITY_COLUMNS].isnull().sum().to_dict()
    total_nulls = sum(null_counts.values())
    if total_nulls > 0:
        raise ValueError(f"Null values detected in susceptibility dataset: {null_counts}")

    num_cols = ["latitude", "longitude", "elevation_m", "slope_deg", "aspect_deg", "curvature",
                "distance_to_drainage_m", "historical_ls_density", "distance_to_historical_ls_m"]
    for col in num_cols:
        if np.isinf(df[col]).any():
            raise ValueError(f"Infinite values detected in column {col}")

    # 4. Spatial validity
    if not df["latitude"].between(20.0, 30.5).all():
        raise ValueError("Latitude out of NER bounds [20.0, 30.5]")
    if not df["longitude"].between(88.0, 98.0).all():
        raise ValueError("Longitude out of NER bounds [88.0, 98.0]")

    # 5. Range checks
    if df["elevation_m"].min() < -50 or df["elevation_m"].max() > 9000:
        raise ValueError(f"Invalid elevation range: [{df['elevation_m'].min()}, {df['elevation_m'].max()}]")
    if df["slope_deg"].min() < 0 or df["slope_deg"].max() > 90:
        raise ValueError(f"Invalid slope range: [{df['slope_deg'].min()}, {df['slope_deg'].max()}]")

    # 6. Target balance
    pos_count = int((df["label"] == 1).sum())
    neg_count = int((df["label"] == 0).sum())
    total_count = len(df)
    logger.info(f"Susceptibility Target Balance: Positives={pos_count} ({pos_count/total_count:.1%}), Controls={neg_count} ({neg_count/total_count:.1%})")

    sha256 = calculate_sha256(SUSCEPTIBILITY_FILE)
    meta = {
        "dataset_name": "susceptibility_dataset",
        "dataset_version": "v1",
        "file_path": str(SUSCEPTIBILITY_FILE),
        "sha256": sha256,
        "rows": len(df),
        "columns": len(df.columns),
        "positive_samples": pos_count,
        "control_samples": neg_count,
        "status": "VALIDATED"
    }
    logger.info(f"Susceptibility Dataset SHA-256: {sha256}")
    return meta


def validate_dynamic_risk_dataset() -> dict:
    logger.info(f"--- Validating Dynamic Risk Dataset: {DYNAMIC_RISK_FILE} ---")
    if not DYNAMIC_RISK_FILE.exists():
        raise FileNotFoundError(f"Missing dynamic risk dataset: {DYNAMIC_RISK_FILE}")

    df = pd.read_csv(DYNAMIC_RISK_FILE)
    if df.empty:
        raise ValueError("Dynamic risk dataset is empty!")

    # 1. Schema check
    missing_cols = set(DYNAMIC_RISK_COLUMNS) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Dynamic risk dataset missing columns: {missing_cols}")

    # 2. Missing/Infinite values check
    null_counts = df[DYNAMIC_RISK_COLUMNS].isnull().sum().to_dict()
    total_nulls = sum(null_counts.values())
    if total_nulls > 0:
        raise ValueError(f"Null values detected in dynamic risk dataset: {null_counts}")

    num_cols = ["base_susceptibility", "rainfall_1h_mm", "rainfall_3h_mm", "rainfall_6h_mm",
                "rainfall_12h_mm", "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_7d_mm",
                "soil_moisture", "forecast_rain_6h_mm", "forecast_rain_24h_mm", "forecast_rain_48h_mm"]
    for col in num_cols:
        if np.isinf(df[col]).any():
            raise ValueError(f"Infinite values detected in column {col}")

    # 3. Spatial & Value Range checks
    if not df["latitude"].between(20.0, 30.5).all():
        raise ValueError("Latitude out of NER bounds")
    if not df["longitude"].between(88.0, 98.0).all():
        raise ValueError("Longitude out of NER bounds")

    if df["base_susceptibility"].min() < 0 or df["base_susceptibility"].max() > 100:
        raise ValueError("base_susceptibility must be in range [0, 100]")
    if df["rainfall_24h_mm"].min() < 0 or df["rainfall_24h_mm"].max() > 1500:
        raise ValueError("Invalid rainfall_24h_mm range")
    if df["soil_moisture"].min() < 0.0 or df["soil_moisture"].max() > 1.0:
        raise ValueError("soil_moisture volumetric content out of bounds [0, 1]")

    # 4. Target Distributions
    targets = ["landslide_within_6h", "landslide_within_24h", "landslide_within_48h", "landslide_within_72h"]
    target_stats = {}
    for t in targets:
        pos = int((df[t] == 1).sum())
        target_stats[t] = {"positives": pos, "rate": round(pos / len(df), 4)}
        logger.info(f"Target '{t}': Positives={pos} ({pos/len(df):.1%})")

    sha256 = calculate_sha256(DYNAMIC_RISK_FILE)
    meta = {
        "dataset_name": "dynamic_risk_dataset",
        "dataset_version": "v1",
        "file_path": str(DYNAMIC_RISK_FILE),
        "sha256": sha256,
        "rows": len(df),
        "columns": len(df.columns),
        "target_distributions": target_stats,
        "status": "VALIDATED"
    }
    logger.info(f"Dynamic Risk Dataset SHA-256: {sha256}")
    return meta


def validate_all_datasets():
    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    s_meta = validate_susceptibility_dataset()
    d_meta = validate_dynamic_risk_dataset()

    fingerprints = {
        "susceptibility": s_meta,
        "dynamic_risk": d_meta
    }

    out_path = METADATA_DIR / "dataset_fingerprints.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(fingerprints, f, indent=2)

    logger.info(f"Dataset validation completed successfully! Saved fingerprints to {out_path}")
    return fingerprints


if __name__ == "__main__":
    validate_all_datasets()
