"""
train_dynamic_risk.py
---------------------
Phase 4: Model 2 — Dynamic Risk Training Pipeline (Current & 24h Horizons).
Runs leakage checks, spatio-temporal split, fits deterministic preprocessing,
trains XGBoost for current and 24h horizons, evaluates metrics, calculates SHAP explanations,
and packages artifacts under models/dynamic_risk/v1/.
"""

import datetime
import json
import logging
import platform
import sys
from pathlib import Path
import pandas as pd
import yaml
import xgboost as xgb

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(PROJECT_ROOT))

from ml.data_validation.validate_datasets import validate_dynamic_risk_dataset
from ml.preprocessing.leakage import audit_dynamic_dataset_leakage
from ml.preprocessing.preprocessing import ModelPreprocessor
from ml.preprocessing.temporal_split import spatio_temporal_split
from ml.evaluation.evaluate_susceptibility import evaluate_model_predictions
from ml.explainability.shap_susceptibility import generate_shap_explanations

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_dynamic_risk")

CONFIG_PATH = PROJECT_ROOT / "configs" / "dynamic_risk.yaml"
DATA_PATH = PROJECT_ROOT / "data" / "final" / "dynamic_risk_dataset.csv"
MODEL_OUTPUT_DIR = PROJECT_ROOT / "models" / "dynamic_risk" / "v1"


def run_training():
    logger.info("=======================================================")
    logger.info("  STARTING MODEL 2 — DYNAMIC RISK TRAINING (CURRENT & 24H)")
    logger.info("=======================================================")

    # 1. Load config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 2. Validate dataset
    dataset_meta = validate_dynamic_risk_dataset()

    # 3. Define feature columns
    feature_list = [
        "base_susceptibility",
        "rainfall_1h_mm", "rainfall_3h_mm", "rainfall_6h_mm", "rainfall_12h_mm",
        "rainfall_24h_mm", "rainfall_72h_mm", "rainfall_7d_mm",
        "soil_moisture",
        "forecast_rain_6h_mm", "forecast_rain_24h_mm", "forecast_rain_48h_mm"
    ]

    # 4. Leakage Gate Audit
    df = pd.read_csv(DATA_PATH)
    audit_dynamic_dataset_leakage(df, feature_list)

    # 5. Spatio-temporal split
    train_df, val_df, split_meta = spatio_temporal_split(
        df,
        timestamp_col="timestamp",
        val_fraction=0.2
    )

    # 6. Fit & transform preprocessor
    preprocessor = ModelPreprocessor(
        feature_list=feature_list,
        categorical_features=[]
    )
    X_train, _ = preprocessor.fit_transform_training_data(train_df, target_col="landslide_within_6h")
    X_val, _ = preprocessor.fit_transform_training_data(val_df, target_col="landslide_within_6h")

    params = config["model"]["params"]
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Train Current-Risk Model (Target: landslide_within_6h) ---
    logger.info("Training Model 2 (Current Risk) XGBoost...")
    y_train_curr = train_df["landslide_within_6h"]
    y_val_curr = val_df["landslide_within_6h"]

    model_curr = xgb.XGBClassifier(**params, random_state=42)
    model_curr.fit(X_train, y_train_curr, eval_set=[(X_val, y_val_curr)], verbose=100)
    
    y_val_prob_curr = model_curr.predict_proba(X_val)[:, 1]
    metrics_curr = evaluate_model_predictions(y_val_curr.values, y_val_prob_curr, threshold=0.5)
    logger.info(f"Model 2 Current Risk Metrics: {metrics_curr}")

    model_curr.save_model(str(MODEL_OUTPUT_DIR / "model_current.json"))
    shap_meta_curr = generate_shap_explanations(model_curr, X_val, MODEL_OUTPUT_DIR / "shap_current")

    # --- Train 24h-Risk Model (Target: landslide_within_24h) ---
    logger.info("Training Model 2 (24h Risk) XGBoost...")
    y_train_24h = train_df["landslide_within_24h"]
    y_val_24h = val_df["landslide_within_24h"]

    model_24h = xgb.XGBClassifier(**params, random_state=42)
    model_24h.fit(X_train, y_train_24h, eval_set=[(X_val, y_val_24h)], verbose=100)

    y_val_prob_24h = model_24h.predict_proba(X_val)[:, 1]
    metrics_24h = evaluate_model_predictions(y_val_24h.values, y_val_prob_24h, threshold=0.5)
    logger.info(f"Model 2 24h Risk Metrics: {metrics_24h}")

    model_24h.save_model(str(MODEL_OUTPUT_DIR / "model_24h.json"))
    shap_meta_24h = generate_shap_explanations(model_24h, X_val, MODEL_OUTPUT_DIR / "shap_24h")

    # Save preprocessor
    preprocessor.save(MODEL_OUTPUT_DIR / "preprocessor.json")

    # Environment metadata
    env_meta = {
        "python_version": sys.version,
        "xgboost_version": xgb.__version__,
        "platform": platform.platform()
    }
    with open(MODEL_OUTPUT_DIR / "environment.json", "w", encoding="utf-8") as f:
        json.dump(env_meta, f, indent=2)

    combined_metrics = {
        "current_risk": metrics_curr,
        "risk_24h": metrics_24h
    }
    with open(MODEL_OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(combined_metrics, f, indent=2)

    model_metadata = {
        "model_id": config["model"]["name"],
        "model_version": "v1.0",
        "dataset_name": dataset_meta["dataset_name"],
        "dataset_version": dataset_meta["dataset_version"],
        "dataset_sha256": dataset_meta["sha256"],
        "feature_schema_version": "v1.0",
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "validation_method": split_meta["strategy"],
        "split_metadata": split_meta,
        "horizons_trained": ["current", "24h"],
        "horizons_unsupported": ["6h", "48h", "72h"],
        "metrics": combined_metrics,
        "thresholds": {"positive_class_threshold": 0.5},
        "features": feature_list
    }
    with open(MODEL_OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)

    # Validation Report MD
    with open(MODEL_OUTPUT_DIR / "validation_report.md", "w", encoding="utf-8") as f:
        f.write(f"""# Model 2 (Dynamic Risk) Validation Report
Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}

## Model Identity
- **Model ID:** {config['model']['name']}
- **Dataset SHA-256:** `{dataset_meta['sha256']}`
- **Validation Strategy:** Temporal Split (Training: {split_meta['train_time_range']}, Val: {split_meta['val_time_range']})

## Performance Metrics

### Current Risk Horizon (T+6h target proxy)
- **ROC-AUC:** {metrics_curr['roc_auc']}
- **PR-AUC:** {metrics_curr['pr_auc']}
- **Precision:** {metrics_curr['precision']}
- **Recall:** {metrics_curr['recall']}
- **F1 Score:** {metrics_curr['f1']}
- **Brier Score:** {metrics_curr['brier_score']}
- **Mean Calibration Error:** {metrics_curr['mean_calibration_error']}

### 24h Risk Horizon (T+24h target)
- **ROC-AUC:** {metrics_24h['roc_auc']}
- **PR-AUC:** {metrics_24h['pr_auc']}
- **Precision:** {metrics_24h['precision']}
- **Recall:** {metrics_24h['recall']}
- **F1 Score:** {metrics_24h['f1']}
- **Brier Score:** {metrics_24h['brier_score']}
- **Mean Calibration Error:** {metrics_24h['mean_calibration_error']}

## Unsupported Horizons
Horizons `6h`, `48h`, and `72h` are marked `validated: false` until explicit training is requested.
""")

    logger.info(f"Model 2 training complete! Saved artifacts to: {MODEL_OUTPUT_DIR}")
    return model_metadata


if __name__ == "__main__":
    run_training()
