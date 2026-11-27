import logging

import pandas as pd
from scipy.stats import loguniform, randint, uniform
from sklearn.base import BaseEstimator
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from xgboost import XGBClassifier

from model.evaluation import compute_metrics
from model.preprocessing import RANDOM_STATE, build_preprocessor

logger = logging.getLogger(__name__)

CV_FOLDS = 5
N_ITER = 30
METRICS = ["accuracy", "precision", "recall", "f1", "roc_auc"]

PARAM_GRIDS = {
    "Logistic Regression": {
        "model__C": loguniform(1e-3, 1e2),
        "model__l1_ratio": [0.0, 1.0],
        "model__solver": ["liblinear", "saga"],
    },
    "SVC": {
        "model__estimator__C": loguniform(1e-2, 1e2),
        "model__estimator__gamma": loguniform(1e-4, 1e0),
        "model__estimator__kernel": ["rbf", "linear"],
    },
    "XGBoost": {
        "model__n_estimators": randint(100, 600),
        "model__max_depth": randint(2, 8),
        "model__learning_rate": loguniform(1e-2, 3e-1),
        "model__subsample": uniform(0.6, 0.4),
        "model__colsample_bytree": uniform(0.6, 0.4),
        "model__min_child_weight": randint(1, 10),
    },
}


def candidate_models() -> dict[str, BaseEstimator]:
    return {
        "Logistic Regression": LogisticRegression(max_iter=5000, random_state=RANDOM_STATE),
        "SVC": CalibratedClassifierCV(SVC(random_state=RANDOM_STATE), ensemble=False),
        "XGBoost": XGBClassifier(eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1),
    }


def make_pipeline(model: BaseEstimator) -> Pipeline:
    return Pipeline([("preprocessor", build_preprocessor()), ("model", model)])


def _cv() -> StratifiedKFold:
    return StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)


def compare_models(X_train: pd.DataFrame, y_train: pd.Series) -> list[dict]:
    rows = []
    for name, model in candidate_models().items():
        logger.info("Cross-validating %s", name)
        scores = cross_validate(make_pipeline(model), X_train, y_train, cv=_cv(), scoring=compute_metrics, n_jobs=-1)
        rows.append({"model": name, **{m: round(scores[f"test_{m}"].mean(), 4) for m in METRICS}})
    return sorted(rows, key=lambda r: r["roc_auc"], reverse=True)


def tune(name: str, X_train: pd.DataFrame, y_train: pd.Series) -> RandomizedSearchCV:
    search = RandomizedSearchCV(
        make_pipeline(candidate_models()[name]),
        PARAM_GRIDS[name],
        n_iter=N_ITER,
        scoring="roc_auc",
        cv=_cv(),
        random_state=RANDOM_STATE,
        n_jobs=-1,
        refit=True,
    )
    search.fit(X_train, y_train)
    logger.info("Best CV AUC %.4f with %s", search.best_score_, search.best_params_)
    return search
