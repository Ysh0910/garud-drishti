"""
shap_susceptibility.py
----------------------
SHAP Explainability Module for GARUD DRISHTI Models.
Computes TreeSHAP feature attribution values, global feature importance rankings,
and saves summary plots and local feature contributions.
"""

import json
from pathlib import Path
from typing import Dict, Any
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def generate_shap_explanations(
    model,
    X_val: pd.DataFrame,
    output_dir: Path
) -> Dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_val)

    # 1. Global feature importance (mean absolute SHAP value)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    importance_df = pd.DataFrame({
        "feature": X_val.columns,
        "mean_abs_shap": mean_abs_shap
    }).sort_values(by="mean_abs_shap", ascending=False)

    importance_df.to_csv(output_dir / "feature_importance.csv", index=False)

    # 2. SHAP Summary Plot
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_values, X_val, show=False)
    plot_path = output_dir / "shap_summary.png"
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()

    meta = {
        "num_samples_explained": len(X_val),
        "top_features": importance_df.head(5)["feature"].tolist(),
        "summary_plot": str(plot_path)
    }

    with open(output_dir / "shap_metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    return meta
