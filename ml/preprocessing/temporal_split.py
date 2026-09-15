"""
temporal_split.py
------------------
Temporal and Spatio-Temporal Train/Validation Split for Dynamic Risk Model.
Respects time boundaries (earlier historical period -> training, later period/event -> validation).
"""

from typing import Dict, Tuple
import pandas as pd


def spatio_temporal_split(
    df: pd.DataFrame,
    timestamp_col: str = "timestamp",
    val_fraction: float = 0.2
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Splits dynamic risk data by time order so validation occurs strictly in a later period.
    """
    df_sorted = df.sort_values(by=timestamp_col).reset_index(drop=True)
    split_idx = int(len(df_sorted) * (1.0 - val_fraction))

    train_df = df_sorted.iloc[:split_idx].copy()
    val_df = df_sorted.iloc[split_idx:].copy()

    meta = {
        "strategy": "spatio_temporal_split",
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "train_time_range": [str(train_df[timestamp_col].min()), str(train_df[timestamp_col].max())],
        "val_time_range": [str(val_df[timestamp_col].min()), str(val_df[timestamp_col].max())]
    }

    return train_df, val_df, meta
