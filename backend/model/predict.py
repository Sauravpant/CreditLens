import json
from functools import cache
from pathlib import Path

import joblib
import pandas as pd
import shap
from sklearn.pipeline import Pipeline

from data.generate import debt_to_income
from model.preprocessing import FEATURES
from model.shap_analysis import explain

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
TOP_N_FACTORS = 3

FEATURE_LABELS = {
    "age": "age",
    "gender": "gender",
    "income_monthly": "monthly income",
    "employment_type": "employment type",
    "employment_years": "years employed",
    "loan_amount": "loan amount",
    "loan_purpose": "loan purpose",
    "interest_rate": "interest rate",
    "existing_loans": "number of existing loans",
    "debt_to_income": "debt-to-income ratio",
    "has_collateral": "collateral",
    "credit_history_months": "credit history length",
    "province": "province",
}


@cache
def load_artifacts() -> tuple[Pipeline, shap.Explainer, dict]:
    pipeline = joblib.load(ARTIFACTS_DIR / "pipeline.pkl")
    explainer = joblib.load(ARTIFACTS_DIR / "shap_explainer.pkl")
    summary = json.loads((ARTIFACTS_DIR / "training_summary.json").read_text())
    return pipeline, explainer, summary


def risk_level(score: float) -> str:
    if score < 0.3:
        return "LOW"
    return "MEDIUM" if score <= 0.6 else "HIGH"


def to_features(applicant: dict) -> pd.DataFrame:
    row = dict(applicant)
    row["debt_to_income"] = round(float(debt_to_income(
        row["income_monthly"], row["loan_amount"], row["interest_rate"], row["loan_purpose"], row["existing_loans"]
    )), 4)
    return pd.DataFrame([row])[FEATURES]


def _factors(contributions: pd.Series, limit: int | None = None) -> list[dict]:
    top = contributions.reindex(contributions.abs().sort_values(ascending=False).index)[:limit]
    return [
        {
            "feature": name,
            "impact": round(float(value), 4),
            "direction": "increases risk" if value > 0 else "decreases risk",
        }
        for name, value in top.items()
    ]


def _display(feature: str, value: object) -> str:
    if feature == "has_collateral":
        return "provided" if value else "none"
    if feature == "interest_rate":
        return f"{float(value):g}%"
    if feature == "debt_to_income":
        return f"{float(value):.0%}"
    if feature in ("income_monthly", "loan_amount"):
        return f"NPR {float(value):,.0f}"
    if feature in ("credit_history_months", "employment_years"):
        return f"{value} {'months' if feature == 'credit_history_months' else 'years'}"
    return str(value)


def _explanation(level: str, factors: list[dict], features: pd.Series) -> str:
    def describe(f: dict) -> str:
        return f"{FEATURE_LABELS[f['feature']]} ({_display(f['feature'], features[f['feature']])})"

    up = [describe(f) for f in factors if f["impact"] > 0]
    down = [describe(f) for f in factors if f["impact"] <= 0]
    parts = [f"{level.capitalize()} risk."]
    if up:
        parts.append(f"Risk is raised mainly by {' and '.join(up)}.")
    if down:
        parts.append(f"Risk is lowered by {' and '.join(down)}.")
    return " ".join(parts)


def predict(applicant: dict) -> dict:
    pipeline, explainer, summary = load_artifacts()
    features = to_features(applicant)
    score = float(pipeline.predict_proba(features)[0, 1])
    level = risk_level(score)
    contributions = explain(explainer, pipeline, features).iloc[0]
    factors = _factors(contributions, TOP_N_FACTORS)
    return {
        "risk_score": round(score, 4),
        "risk_level": level,
        "top_factors": factors,
        "contributions": _factors(contributions),
        "debt_to_income": float(features.iloc[0]["debt_to_income"]),
        "explanation": _explanation(level, factors, features.iloc[0]),
        "model_used": summary["model_used"],
    }


if __name__ == "__main__":
    risky = {
        "age": 24, "gender": "M", "income_monthly": 15_000, "employment_type": "Agriculture",
        "employment_years": 2, "loan_amount": 150_000, "loan_purpose": "Agriculture", "interest_rate": 17.5,
        "existing_loans": 3, "has_collateral": False, "credit_history_months": 6, "province": 6,
    }
    safe = {
        "age": 45, "gender": "F", "income_monthly": 90_000, "employment_type": "Government",
        "employment_years": 20, "loan_amount": 2_000_000, "loan_purpose": "Housing", "interest_rate": 9.5,
        "existing_loans": 0, "has_collateral": True, "credit_history_months": 240, "province": 3,
    }
    risky_result, safe_result = predict(risky), predict(safe)
    for result in (risky_result, safe_result):
        print(json.dumps(result, indent=2))
        assert set(result) == {"risk_score", "risk_level", "top_factors", "contributions", "debt_to_income", "explanation", "model_used"}
        assert 0 <= result["risk_score"] <= 1 and len(result["top_factors"]) == TOP_N_FACTORS
    assert risky_result["risk_score"] > safe_result["risk_score"]
    print("predict() self-check passed")
