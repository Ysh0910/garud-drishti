"""
predictor.py
------------
Phase 5: Deterministic ML Inference Engine for GARUD DRISHTI.
Loads versioned trained artifacts from models/ and provides:
- predict_base_susceptibility(static_features_df)
- predict_dynamic_risk(dynamic_features_df)
Strictly adheres to contracts/ml.md and contracts/risk.md semantics.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd
import xgboost as xgb

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys_path_root = str(PROJECT_ROOT)
import sys
if sys_path_root not in sys.path:
    sys.path.append(sys_path_root)

from ml.preprocessing.preprocessing import ModelPreprocessor

SUSCEPTIBILITY_MODEL_DIR = PROJECT_ROOT / "models" / "susceptibility" / "v1"
DYNAMIC_RISK_MODEL_DIR = PROJECT_ROOT / "models" / "dynamic_risk" / "v1"


def get_risk_level(score: int) -> str:
    """Classifies 0-100 risk score into standard risk band."""
    if score <= 20:
        return "VERY_LOW"
    elif score <= 40:
        return "LOW"
    elif score <= 60:
        return "MODERATE"
    elif score <= 80:
        return "HIGH"
    else:
        return "CRITICAL"


class GarudDrishtiInferenceEngine:
    """
    Production Inference Engine loading pre-fitted preprocessors and model binaries from disk.
    """
    def __init__(
        self,
        susc_dir: Path = SUSCEPTIBILITY_MODEL_DIR,
        risk_dir: Path = DYNAMIC_RISK_MODEL_DIR
    ):
        self.susc_dir = susc_dir
        self.risk_dir = risk_dir

        # Load Model 1
        self.susc_model = xgb.XGBClassifier()
        self.susc_model.load_model(str(susc_dir / "model.json"))
        self.susc_preprocessor = ModelPreprocessor.load(susc_dir / "preprocessor.json")
        with open(susc_dir / "metadata.json", "r", encoding="utf-8") as f:
            self.susc_metadata = json.load(f)

        # Load Model 2
        self.risk_curr_model = xgb.XGBClassifier()
        self.risk_curr_model.load_model(str(risk_dir / "model_current.json"))
        
        self.risk_24h_model = xgb.XGBClassifier()
        self.risk_24h_model.load_model(str(risk_dir / "model_24h.json"))
        
        self.risk_preprocessor = ModelPreprocessor.load(risk_dir / "preprocessor.json")
        with open(risk_dir / "metadata.json", "r", encoding="utf-8") as f:
            self.risk_metadata = json.load(f)

    def predict_base_susceptibility(self, static_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Runs Model 1 inference for a dataframe of static features.
        Returns base_susceptibility_raw (float 0-1) and base_susceptibility (integer 0-100).
        """
        X = self.susc_preprocessor.transform_inference_data(static_df)
        probs = self.susc_model.predict_proba(X)[:, 1]

        results = []
        for prob in probs:
            score = int(np.round(prob * 100))
            results.append({
                "base_susceptibility_raw": float(prob),
                "base_susceptibility": score,
                "susceptibility_level": get_risk_level(score),
                "model_version": self.susc_metadata["model_version"]
            })
        return results

    def predict_dynamic_risk(self, dynamic_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Runs Model 2 inference for dynamic features (including base_susceptibility).
        Returns current_risk and risk_24h integer indices (0-100).
        """
        X = self.risk_preprocessor.transform_inference_data(dynamic_df)
        
        probs_curr = self.risk_curr_model.predict_proba(X)[:, 1]
        probs_24h = self.risk_24h_model.predict_proba(X)[:, 1]

        results = []
        for p_curr, p_24h in zip(probs_curr, probs_24h):
            curr_score = int(np.round(p_curr * 100))
            score_24h = int(np.round(p_24h * 100))

            results.append({
                "current_risk_raw": float(p_curr),
                "current_risk": curr_score,
                "current_risk_level": get_risk_level(curr_score),
                "risk_24h_raw": float(p_24h),
                "risk_24h": score_24h,
                "risk_24h_level": get_risk_level(score_24h),
                "horizons_supported": {
                    "current": {"validated": True, "score": curr_score},
                    "24h": {"validated": True, "score": score_24h},
                    "6h": {"validated": False, "score": None},
                    "48h": {"validated": False, "score": None},
                    "72h": {"validated": False, "score": None}
                },
                "model_version": self.risk_metadata["model_version"]
            })
        return results
