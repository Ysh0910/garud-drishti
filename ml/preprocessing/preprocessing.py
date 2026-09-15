"""
preprocessing.py
----------------
Deterministic Preprocessing Pipeline for GARUD DRISHTI ML Models.
Fills/encodes categorical variables and orders numeric features consistently.
Saves preprocessor mappings so inference uses exact fitted encoders.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class CategoricalPreprocessor:
    """
    Deterministic categorical encoder that maps string categories to integers or one-hot vectors,
    storing category mappings to guarantee reproducibility during inference.
    """
    def __init__(self, categorical_columns: List[str]):
        self.categorical_columns = categorical_columns
        self.category_maps: Dict[str, Dict[str, int]] = {}
        self.unknown_index = 0
        self.is_fitted = False

    def fit(self, df: pd.DataFrame) -> "CategoricalPreprocessor":
        for col in self.categorical_columns:
            if col not in df.columns:
                continue
            unique_vals = sorted([str(x) for x in df[col].dropna().unique()])
            # Reserve 0 for unknown/unseen categories
            mapping = {val: i + 1 for i, val in enumerate(unique_vals)}
            self.category_maps[col] = mapping
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted:
            raise RuntimeError("CategoricalPreprocessor must be fitted before calling transform()")
        df_out = df.copy()
        for col, mapping in self.category_maps.items():
            if col in df_out.columns:
                df_out[col] = df_out[col].astype(str).map(lambda val: mapping.get(val, 0)).astype(int)
        return df_out

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return self.fit(df).transform(df)

    def save(self, filepath: Path):
        data = {
            "categorical_columns": self.categorical_columns,
            "category_maps": self.category_maps,
            "is_fitted": self.is_fitted
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, filepath: Path) -> "CategoricalPreprocessor":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        obj = cls(categorical_columns=data["categorical_columns"])
        obj.category_maps = data["category_maps"]
        obj.is_fitted = data["is_fitted"]
        return obj


class ModelPreprocessor:
    """
    Complete ML Preprocessor handling feature ordering, categorical encoding,
    and target extraction according to configs.
    """
    def __init__(self, feature_list: List[str], categorical_features: Optional[List[str]] = None):
        self.feature_list = feature_list
        self.categorical_features = categorical_features or []
        self.cat_encoder = CategoricalPreprocessor(self.categorical_features)

    def fit_transform_training_data(
        self, df: pd.DataFrame, target_col: str
    ) -> Tuple[pd.DataFrame, pd.Series]:
        # 1. Fit categorical encoder
        df_encoded = self.cat_encoder.fit_transform(df)
        
        # 2. Extract features in exact order
        X = df_encoded[self.feature_list].copy()
        y = df[target_col].copy()
        return X, y

    def transform_inference_data(self, df: pd.DataFrame) -> pd.DataFrame:
        df_encoded = self.cat_encoder.transform(df)
        X = df_encoded[self.feature_list].copy()
        return X

    def save(self, filepath: Path):
        meta = {
            "feature_list": self.feature_list,
            "categorical_features": self.categorical_features
        }
        meta_path = filepath.parent / (filepath.stem + "_meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
        
        self.cat_encoder.save(filepath)

    @classmethod
    def load(cls, filepath: Path) -> "ModelPreprocessor":
        meta_path = filepath.parent / (filepath.stem + "_meta.json")
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        
        obj = cls(
            feature_list=meta["feature_list"],
            categorical_features=meta["categorical_features"]
        )
        obj.cat_encoder = CategoricalPreprocessor.load(filepath)
        return obj
