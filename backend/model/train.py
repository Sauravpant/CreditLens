import json
import logging
from pathlib import Path

import joblib
import matplotlib
import pandas as pd
from sklearn.model_selection import RandomizedSearchCV

from model import evaluation, preprocessing, shap_analysis, training

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"


def _write_json(name: str, payload: dict | list) -> None:
    (ARTIFACTS_DIR / name).write_text(json.dumps(payload, indent=2, default=str))


def _evaluate(search: RandomizedSearchCV, data: tuple) -> dict:
    X_train, X_test, y_train, y_test = data
    pipeline = search.best_estimator_
    metrics = {
        "train": evaluation.compute_metrics(pipeline, X_train, y_train),
        "test": evaluation.compute_metrics(pipeline, X_test, y_test),
    }
    report, matrix = evaluation.detailed_report(pipeline, X_test, y_test)
    metrics["confusion_matrix"] = matrix
    evaluation.plot_calibration(pipeline, X_test, y_test, ARTIFACTS_DIR / "calibration_curve.png")
    print("\nTrain vs test (tuned model):")
    print(evaluation.format_table([{"model": f"{k} set", **v} for k, v in metrics.items() if k in ("train", "test")]))
    print(f"\nClassification report (test):\n{report}")
    print(f"Confusion matrix [[TN, FP], [FN, TP]]: {matrix}")
    return metrics


def _explain(search: RandomizedSearchCV, X_train: pd.DataFrame, X_test: pd.DataFrame) -> dict[str, float]:
    pipeline = search.best_estimator_
    explainer = shap_analysis.build_explainer(pipeline, X_train)
    importance = shap_analysis.global_importance(explainer, pipeline, X_test)
    shap_analysis.plot_global(importance, ARTIFACTS_DIR / "global_importance.png")
    shap_analysis.plot_local(explainer, pipeline, X_test.iloc[[0]], ARTIFACTS_DIR / "local_explanation.png")
    joblib.dump(explainer, ARTIFACTS_DIR / "shap_explainer.pkl")
    _write_json("global_importance.json", importance)
    return importance


def main() -> None:
    matplotlib.use("Agg")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    data = preprocessing.split(preprocessing.load_data())
    X_train, X_test, y_train, _ = data

    comparison = training.compare_models(X_train, y_train)
    print(f"\nModel comparison ({training.CV_FOLDS}-fold CV on train set):")
    print(evaluation.format_table(comparison))
    _write_json("comparison.json", comparison)

    winner = comparison[0]["model"]
    print(f"\nWinner by AUC-ROC: {winner}. Tuning with RandomizedSearchCV ({training.N_ITER} iterations)...")
    search = training.tune(winner, X_train, y_train)
    best_params = {
        k.removeprefix("model__").removeprefix("estimator__"): v.item() if hasattr(v, "item") else v
        for k, v in search.best_params_.items()
    }
    print(f"Best params: {best_params}\nBest CV AUC: {search.best_score_:.4f}")

    metrics = _evaluate(search, data)
    importance = _explain(search, X_train, X_test)
    joblib.dump(search.best_estimator_, ARTIFACTS_DIR / "pipeline.pkl")
    _write_json("metrics.json", metrics)
    _write_json("training_summary.json", {
        "model_used": f"{winner} (tuned)",
        "best_model": winner,
        "best_params": best_params,
        "cv_auc": round(search.best_score_, 4),
        "train_metrics": metrics["train"],
        "test_metrics": metrics["test"],
        "top_features": list(importance)[:5],
    })
    print(f"\nArtifacts saved to {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
