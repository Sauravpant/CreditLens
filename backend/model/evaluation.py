from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.calibration import CalibrationDisplay
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline

DECISION_THRESHOLD = 0.3


def compute_metrics(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> dict[str, float]:
    proba = pipeline.predict_proba(X)[:, 1]
    pred = proba >= DECISION_THRESHOLD
    return {
        "accuracy": round(accuracy_score(y, pred), 4),
        "precision": round(precision_score(y, pred, zero_division=0), 4),
        "recall": round(recall_score(y, pred, zero_division=0), 4),
        "f1": round(f1_score(y, pred, zero_division=0), 4),
        "roc_auc": round(roc_auc_score(y, proba), 4),
    }


def format_table(rows: list[dict]) -> str:
    header = f"{'Model':<22}{'Accuracy':>10}{'Precision':>11}{'Recall':>9}{'F1':>8}{'AUC-ROC':>9}"
    lines = [header, "-" * len(header)]
    for r in rows:
        lines.append(
            f"{r['model']:<22}{r['accuracy']:>10.4f}{r['precision']:>11.4f}"
            f"{r['recall']:>9.4f}{r['f1']:>8.4f}{r['roc_auc']:>9.4f}"
        )
    return "\n".join(lines)


def detailed_report(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> tuple[str, list[list[int]]]:
    pred = pipeline.predict_proba(X)[:, 1] >= DECISION_THRESHOLD
    report = classification_report(y, pred, target_names=["repaid", "defaulted"], zero_division=0)
    return report, confusion_matrix(y, pred).tolist()


def plot_calibration(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series, path: Path) -> None:
    fig, ax = plt.subplots(figsize=(6, 6))
    CalibrationDisplay.from_estimator(pipeline, X, y, n_bins=10, strategy="quantile", ax=ax)
    ax.set_title("Calibration curve (test set)")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
