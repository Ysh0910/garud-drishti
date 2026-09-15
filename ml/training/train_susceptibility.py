"""
train_susceptibility.py
-----------------------
Phase 3: Model 1 — Base Susceptibility Training Pipeline.
Loads config/susceptibility.yaml, validates dataset, runs spatial block split,
fits deterministic preprocessing, trains XGBoost, assesses calibration,
generates SHAP explanations, and packages versioned artifacts under models/susceptibility/v1/.
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

from ml.data_validation.validate_datasets import validate_susceptibility_dataset
from ml.preprocessing.preprocessing import ModelPreprocessor
from ml.preprocessing.spatial_split import spatial_block_split
from ml.evaluation.evaluate_susceptibility import evaluate_model_predictions
from ml.explainability.shap_susceptibility import generate_shap_explanations

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_susceptibility")

CONFIG_PATH = PROJECT_ROOT / "configs" / "susceptibility.yaml"
DATA_PATH = PROJECT_ROOT / "data" / "final" / "susceptibility_dataset.csv"
MODEL_OUTPUT_DIR = PROJECT_ROOT / "models" / "susceptibility" / "v1"


def run_training():
    logger.info("=======================================================")
    logger.info("  STARTING MODEL 1 — BASE SUSCEPTIBILITY TRAINING")
    logger.info("=======================================================")

    # 1. Load config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # 2. Validate dataset & get fingerprint
    dataset_meta = validate_susceptibility_dataset()

    # 3. Load dataset
    df = pd.read_csv(DATA_PATH)
    feature_list = config["features"]
    categorical_features = ["landcover", "geology", "geomorphology", "hydrological_condition"]

    # 4. Spatial block split
    train_df, val_df, split_meta = spatial_block_split(
        df,
        block_size_km=config["validation"].get("block_size_km", 10.0),
        test_size=0.2,
        random_state=42
    )

    # 5. Fit & transform preprocessor
    preprocessor = ModelPreprocessor(
        feature_list=feature_list,
        categorical_features=categorical_features
    )
    X_train, y_train = preprocessor.fit_transform_training_data(train_df, target_col="label")
    X_val, y_val = preprocessor.fit_transform_training_data(val_df, target_col="label")

    # 6. Train XGBoost
    params = config["model"]["params"]
    logger.info(f"Training XGBoost Model 1 with params: {params}")
    
    model = xgb.XGBClassifier(**params, random_state=42)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)

    # 7. Evaluate Model
    y_val_prob = model.predict_proba(X_val)[:, 1]
    metrics = evaluate_model_predictions(y_val.values, y_val_prob, threshold=0.5)
    logger.info(f"Model 1 Evaluation Metrics: {metrics}")

    # 8. Create Artifact Directory
    MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save fitted XGBoost model
    model_file = MODEL_OUTPUT_DIR / "model.json"
    model.save_model(str(model_file))

    # Save preprocessor
    preprocessor_file = MODEL_OUTPUT_DIR / "preprocessor.json"
    preprocessor.save(preprocessor_file)

    # 9. Generate SHAP explanations
    shap_dir = MODEL_OUTPUT_DIR / "shap"
    shap_meta = generate_shap_explanations(model, X_val, shap_dir)

    # 10. Metadata & Environment
    env_meta = {
        "python_version": sys.version,
        "xgboost_version": xgb.__version__,
        "platform": platform.platform(),
        "processor": platform.processor()
    }
    with open(MODEL_OUTPUT_DIR / "environment.json", "w", encoding="utf-8") as f:
        json.dump(env_meta, f, indent=2)

    with open(MODEL_OUTPUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

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
        "metrics": metrics,
        "thresholds": {"positive_class_threshold": 0.5},
        "features": feature_list,
        "categorical_features": categorical_features
    }
    with open(MODEL_OUTPUT_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)

    # 11. Write Validation Report MD
    with open(MODEL_OUTPUT_DIR / "validation_report.md", "w", encoding="utf-8") as f:
        f.write(f"""# Model 1 (Base Susceptibility) Validation Report
Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}

## Model Identity
- **Model ID:** {config['model']['name']}
- **Dataset SHA-256:** `{dataset_meta['sha256']}`
- **Validation Strategy:** Spatial Block Split (10km x 10km grid)

## Performance Metrics
- **ROC-AUC:** {metrics['roc_auc']}
- **PR-AUC:** {metrics['pr_auc']}
- **Precision:** {metrics['precision']}
- **Recall:** {metrics['recall']}
- **F1 Score:** {metrics['f1']}
- **Brier Score:** {metrics['brier_score']}
- **False Negative Rate:** {metrics['false_negative_rate']}
- **False Alarm Rate:** {metrics['false_alarm_rate']}
- **Mean Calibration Error:** {metrics['mean_calibration_error']}

## Confusion Matrix
- True Negatives: {metrics['confusion_matrix']['true_negatives']}
- False Positives: {metrics['confusion_matrix']['false_positives']}
- False Negatives: {metrics['confusion_matrix']['false_negatives']}
- True Positives: {metrics['confusion_matrix']['true_positives']}

## Top SHAP Features
{', '.join(shap_meta['top_features'])}
""")

    logger.info(f"Model 1 training complete! Saved artifacts to: {MODEL_OUTPUT_DIR}")
    return model_metadata


if __name__ == "__main__":
    run_training()
