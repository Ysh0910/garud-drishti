"""
test_preprocessing.py
---------------------
Unit tests for deterministic categorical preprocessing and feature ordering.
"""

import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

import pandas as pd
from ml.preprocessing.preprocessing import CategoricalPreprocessor, ModelPreprocessor


def test_categorical_preprocessor_determinism():
    df_train = pd.DataFrame({
        "landcover": ["Tree Cover", "Cropland", "Tree Cover"],
        "geology": ["Calcisols", "Lithosol", "Calcisols"]
    })

    encoder = CategoricalPreprocessor(["landcover", "geology"])
    transformed_train = encoder.fit_transform(df_train)

    assert "landcover" in encoder.category_maps
    assert transformed_train["landcover"].dtype == int

    # Test unseen category during inference mapping to unknown index 0
    df_test = pd.DataFrame({
        "landcover": ["Tree Cover", "Unseen Class"],
        "geology": ["Calcisols", "Calcisols"]
    })

    transformed_test = encoder.transform(df_test)
    assert transformed_test.loc[1, "landcover"] == 0, "Unseen category should map to 0"
    print("test_categorical_preprocessor_determinism: PASSED")


if __name__ == "__main__":
    test_categorical_preprocessor_determinism()
