"""
evaluate_susceptibility.py
--------------------------
Evaluation module for Model 1 (Base Susceptibility).
Calculates ROC-AUC, PR-AUC, Precision, Recall, F1, Brier score, Confusion Matrix,
False Negative Rate, False Alarm Rate, and calibration assessment.
"""

import json
from pathlib import Path
from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    roc_auc_score, average_precision_score, precision_score, recall_score,
    f1_score, confusion_matrix, brier_score_loss
)
from sklearn.calibration import calibration_curve


def evaluate_model_predictions(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5
) -> Dict[str, Any]:
    y_pred = (y_prob >= threshold).astype(int)

    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    brier = float(brier_score_loss(y_true, y_prob))

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    far = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    # Calibration assessment
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=5)
    mean_abs_calibration_error = float(np.mean(np.abs(prob_true - prob_pred)))

    metrics = {
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "brier_score": round(brier, 4),
        "false_negative_rate": round(fnr, 4),
        "false_alarm_rate": round(far, 4),
        "mean_calibration_error": round(mean_abs_calibration_error, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "threshold_used": threshold
    }

    return metrics
