from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from model.preprocessing import FEATURES, RANDOM_STATE, original_feature

BACKGROUND_SIZE = 100
KERNEL_SAMPLES = 200


def _dense(matrix: np.ndarray) -> np.ndarray:
    return matrix.toarray() if hasattr(matrix, "toarray") else np.asarray(matrix)


def build_explainer(pipeline: Pipeline, X_background: pd.DataFrame) -> shap.Explainer:
    model = pipeline.named_steps["model"]
    background = _dense(pipeline.named_steps["preprocessor"].transform(X_background))
    background = shap.sample(background, BACKGROUND_SIZE, random_state=RANDOM_STATE)
    if isinstance(model, XGBClassifier):
        return shap.TreeExplainer(model)
    if isinstance(model, LogisticRegression):
        return shap.LinearExplainer(model, background)
    return shap.KernelExplainer(model.predict_proba, shap.kmeans(background, 20))


def _class1(values: np.ndarray | list) -> np.ndarray:
    if isinstance(values, list):
        return np.asarray(values[1])
    values = np.asarray(values)
    return values[..., 1] if values.ndim == 3 else values


def base_value(explainer: shap.Explainer) -> float:
    return float(np.ravel(explainer.expected_value)[-1])


def explain(explainer: shap.Explainer, pipeline: Pipeline, X: pd.DataFrame) -> pd.DataFrame:
    preprocessor = pipeline.named_steps["preprocessor"]
    transformed = _dense(preprocessor.transform(X))
    raw = _class1(explainer.shap_values(transformed))
    columns = [original_feature(n) for n in preprocessor.get_feature_names_out()]
    per_column = pd.DataFrame(raw, columns=columns, index=X.index)
    return per_column.T.groupby(level=0).sum().T[FEATURES]


def global_importance(explainer: shap.Explainer, pipeline: Pipeline, X: pd.DataFrame) -> dict[str, float]:
    if isinstance(explainer, shap.KernelExplainer):
        X = X.sample(min(KERNEL_SAMPLES, len(X)), random_state=RANDOM_STATE)
    importance = explain(explainer, pipeline, X).abs().mean().sort_values(ascending=False)
    return {k: round(float(v), 4) for k, v in importance.items()}


def plot_global(importance: dict[str, float], path: Path) -> None:
    names, values = list(importance)[::-1], list(importance.values())[::-1]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh(names, values, color="#3b6ea5")
    ax.set_xlabel("Mean |SHAP value|")
    ax.set_title("Global feature importance")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_local(explainer: shap.Explainer, pipeline: Pipeline, applicant: pd.DataFrame, path: Path) -> None:
    values = explain(explainer, pipeline, applicant).iloc[0]
    explanation = shap.Explanation(
        values=values.to_numpy(),
        base_values=base_value(explainer),
        data=applicant.iloc[0].to_numpy(),
        feature_names=FEATURES,
    )
    shap.plots.waterfall(explanation, max_display=10, show=False)
    plt.title("Local explanation (example applicant)")
    plt.tight_layout()
    plt.savefig(path, dpi=120)
    plt.close("all")
