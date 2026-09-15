"""
spatial_split.py
----------------
Spatial validation split strategies for GARUD DRISHTI.
Implements Spatial Block Split (10km x 10km grid cells) and District Holdout
to prevent spatial autocorrelation leakage between train and test sets.
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict


def spatial_block_split(
    df: pd.DataFrame,
    lat_col: str = "latitude",
    lon_col: str = "longitude",
    block_size_km: float = 10.0,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Splits samples based on a spatial grid block (approx block_size_km x block_size_km).
    Ensures no spatial block appears in both train and validation splits.
    """
    df_split = df.copy()
    
    # 1 deg lat ~ 111 km, 1 deg lon ~ 100 km at 25N
    lat_step = block_size_km / 111.0
    lon_step = block_size_km / 100.0

    df_split["spatial_block_x"] = (df_split[lon_col] / lon_step).astype(int)
    df_split["spatial_block_y"] = (df_split[lat_col] / lat_step).astype(int)
    df_split["block_id"] = (
        df_split["spatial_block_x"].astype(str) + "_" + df_split["spatial_block_y"].astype(str)
    )

    unique_blocks = df_split["block_id"].unique()
    rng = np.random.RandomState(random_state)
    rng.shuffle(unique_blocks)

    n_test_blocks = int(len(unique_blocks) * test_size)
    test_blocks = set(unique_blocks[:n_test_blocks])
    train_blocks = set(unique_blocks[n_test_blocks:])

    train_df = df_split[df_split["block_id"].isin(train_blocks)].drop(
        columns=["spatial_block_x", "spatial_block_y", "block_id"]
    )
    test_df = df_split[df_split["block_id"].isin(test_blocks)].drop(
        columns=["spatial_block_x", "spatial_block_y", "block_id"]
    )

    meta = {
        "strategy": "spatial_block_split",
        "block_size_km": block_size_km,
        "total_blocks": len(unique_blocks),
        "train_blocks_count": len(train_blocks),
        "val_blocks_count": len(test_blocks),
        "train_rows": len(train_df),
        "val_rows": len(test_df),
    }

    return train_df, test_df, meta


def district_holdout_split(
    df: pd.DataFrame,
    district_col: str = "district",
    test_districts: List[str] = None
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Splits samples by placing entire districts into the validation set.
    """
    if test_districts is None:
        # Pick 20% random districts
        districts = df[district_col].dropna().unique()
        rng = np.random.RandomState(42)
        rng.shuffle(districts)
        n_test = max(1, int(len(districts) * 0.2))
        test_districts = list(districts[:n_test])

    train_df = df[~df[district_col].isin(test_districts)]
    test_df = df[df[district_col].isin(test_districts)]

    meta = {
        "strategy": "district_holdout_split",
        "test_districts": test_districts,
        "train_rows": len(train_df),
        "val_rows": len(test_df)
    }

    return train_df, test_df, meta
