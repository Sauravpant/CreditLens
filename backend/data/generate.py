import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent
OUTPUT_PATH = DATA_DIR / "loans.csv"
REFERENCES_PATH = DATA_DIR / "nrb_references.json"

SEED = 42
N_ROWS = 5000
TARGET_DEFAULT_RATE = 0.10

EMPLOYMENT_WEIGHTS = {"Government": 0.15, "Private": 0.35, "Self-employed": 0.30, "Agriculture": 0.20}
INCOME_MULTIPLIER = {"Government": 1.30, "Private": 1.10, "Self-employed": 1.00, "Agriculture": 0.65}
PURPOSE_WEIGHTS = {"Business": 0.35, "Housing": 0.25, "Personal": 0.20, "Agriculture": 0.10, "Education": 0.10}
AGRI_WORKER_AGRI_LOAN_SHARE = 0.60

LOAN_MULTIPLE_RANGE = {
    "Agriculture": (1, 10), "Personal": (1, 10), "Education": (2, 15),
    "Business": (3, 25), "Housing": (10, 40),
}
TERM_MONTHS = {"Agriculture": 36, "Personal": 36, "Education": 60, "Business": 60, "Housing": 180}
COLLATERAL_PROB = {"Housing": 0.90, "Business": 0.70, "Agriculture": 0.50, "Education": 0.30, "Personal": 0.20}


EXISTING_LOAN_PAYMENT_SHARE = 0.08


EMPLOYMENT_RISK = {"Government": -1.0, "Private": 0.0, "Self-employed": 0.3, "Agriculture": 0.4}
PURPOSE_RISK = {"Agriculture": 0.8, "Personal": 0.3, "Business": 0.2, "Education": 0.0, "Housing": -0.3}


Numeric = float | np.ndarray | pd.Series


def emi(principal: Numeric, annual_rate_pct: Numeric, months: Numeric) -> Numeric:
    """Monthly instalment of an amortising loan. Works on scalars and arrays."""
    r = np.asarray(annual_rate_pct) / 1200
    return principal * r / (1 - (1 + r) ** -np.asarray(months))


def debt_to_income(
    income_monthly: Numeric,
    loan_amount: Numeric,
    interest_rate: Numeric,
    loan_purpose: str | pd.Series,
    existing_loans: Numeric,
) -> Numeric:
    """Monthly debt payments (existing + new loan) divided by monthly income."""
    if isinstance(loan_purpose, pd.Series):
        months = loan_purpose.map(TERM_MONTHS)
    else:
        months = TERM_MONTHS[loan_purpose]
    existing_payments = existing_loans * EXISTING_LOAN_PAYMENT_SHARE * income_monthly
    return (existing_payments + emi(loan_amount, interest_rate, months)) / income_monthly


def _province_weights() -> dict[int, float]:
    """Province sampling weights from NRB loan distribution."""
    refs = json.loads(REFERENCES_PATH.read_text())
    by_province = refs["loans_by_province_npr_billion"]["by_province"]
    total = sum(by_province.values())
    return {int(k): v / total for k, v in by_province.items()}


def _choice(rng: np.random.Generator, weights: dict, n: int) -> np.ndarray:
    """Sample n keys from a {value: weight} dict."""
    return rng.choice(list(weights), size=n, p=list(weights.values()))


def _applicants(rng: np.random.Generator, n: int) -> pd.DataFrame:
    """Demographic, employment and credit-history fields."""
    df = pd.DataFrame({
        "age": np.clip(rng.normal(35, 9, n), 20, 65).astype(int),
        "gender": rng.choice(["M", "F"], size=n, p=[0.6, 0.4]),
        "employment_type": _choice(rng, EMPLOYMENT_WEIGHTS, n),
    })
    multiplier = df["employment_type"].map(INCOME_MULTIPLIER)
    df["income_monthly"] = (rng.lognormal(np.log(30_000), 0.55, n) * multiplier).round(0)
    max_years = df["age"] - 18
    df["employment_years"] = np.clip(max_years - rng.integers(0, 8, n), 0, None)
    history = df["employment_years"] * 12 * rng.uniform(0.3, 1.0, n) + rng.integers(0, 24, n)
    df["credit_history_months"] = np.minimum(history, max_years * 12).astype(int)
    df["province"] = _choice(rng, _province_weights(), n)
    return df


def _loans(rng: np.random.Generator, df: pd.DataFrame) -> pd.DataFrame:
    """Loan purpose, size, rate, collateral and DTI."""
    n = len(df)
    purpose = _choice(rng, PURPOSE_WEIGHTS, n)
    agri_override = (df["employment_type"] == "Agriculture") & (rng.random(n) < AGRI_WORKER_AGRI_LOAN_SHARE)
    df["loan_purpose"] = np.where(agri_override, "Agriculture", purpose)

    low = df["loan_purpose"].map(lambda p: LOAN_MULTIPLE_RANGE[p][0])
    high = df["loan_purpose"].map(lambda p: LOAN_MULTIPLE_RANGE[p][1])
    df["loan_amount"] = (df["income_monthly"] * rng.uniform(low, high)).round(-3).clip(lower=10_000)

    income_pct = df["income_monthly"].rank(pct=True)
    df["interest_rate"] = np.clip(18 - 8 * income_pct + rng.normal(0, 1, n), 8, 18).round(2)
    df["existing_loans"] = np.clip(rng.poisson(0.8, n), 0, 4)
    df["has_collateral"] = rng.random(n) < df["loan_purpose"].map(COLLATERAL_PROB)
    df["debt_to_income"] = debt_to_income(
        df["income_monthly"], df["loan_amount"], df["interest_rate"], df["loan_purpose"], df["existing_loans"]
    ).round(4)
    return df


def _risk_logit(df: pd.DataFrame) -> np.ndarray:
    """Log-odds of default before the intercept."""
    return (
        2.5 * (df["debt_to_income"] - 0.4)
        - 0.6 * np.log(df["income_monthly"] / 30_000)
        - 0.9 * df["has_collateral"]
        + df["employment_type"].map(EMPLOYMENT_RISK)
        + df["loan_purpose"].map(PURPOSE_RISK)
        - 0.005 * (df["credit_history_months"] - 60)
        + 0.06 * (df["interest_rate"] - 12)
        + 0.1 * df["existing_loans"]
    ).to_numpy()


def _calibrated_intercept(logit: np.ndarray, target: float) -> float:
    """Bisect for the intercept that makes the mean default probability hit target."""
    lo, hi = -20.0, 20.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if (1 / (1 + np.exp(-(logit + mid)))).mean() < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def generate(n: int = N_ROWS, seed: int = SEED) -> pd.DataFrame:
    """Build the full dataset."""
    rng = np.random.default_rng(seed)
    df = _loans(rng, _applicants(rng, n))
    logit = _risk_logit(df)
    prob = 1 / (1 + np.exp(-(logit + _calibrated_intercept(logit, TARGET_DEFAULT_RATE))))
    df["defaulted"] = rng.random(n) < prob
    columns = [
        "age", "gender", "income_monthly", "employment_type", "employment_years", "loan_amount",
        "loan_purpose", "interest_rate", "existing_loans", "debt_to_income", "has_collateral",
        "credit_history_months", "province", "defaulted",
    ]
    return df[columns]


def sanity_check(df: pd.DataFrame) -> None:
    """Assert the correlations PROJECT.md requires are present in the data."""
    rate = df["defaulted"].mean()
    by_emp = df.groupby("employment_type")["defaulted"].mean()
    by_purpose = df.groupby("loan_purpose")["defaulted"].mean()
    high_dti = df["debt_to_income"] > df["debt_to_income"].median()
    short_history = df["credit_history_months"] < df["credit_history_months"].median()
    assert abs(rate - TARGET_DEFAULT_RATE) < 0.01, rate
    assert by_emp["Government"] < rate < by_emp["Agriculture"], by_emp
    assert by_purpose["Agriculture"] == by_purpose.max(), by_purpose
    assert df.loc[df["has_collateral"], "defaulted"].mean() < df.loc[~df["has_collateral"], "defaulted"].mean()
    assert df.loc[high_dti, "defaulted"].mean() > df.loc[~high_dti, "defaulted"].mean()
    assert df.loc[short_history, "defaulted"].mean() > df.loc[~short_history, "defaulted"].mean()


if __name__ == "__main__":
    data = generate()
    sanity_check(data)
    data.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(data):,} rows to {OUTPUT_PATH}")
    print(f"Default rate: {data['defaulted'].mean():.3f}")
    print(data.groupby("employment_type")["defaulted"].mean().round(3).to_string())
    print(data.groupby("loan_purpose")["defaulted"].mean().round(3).to_string())
    print(data.describe().round(2).T.to_string())
