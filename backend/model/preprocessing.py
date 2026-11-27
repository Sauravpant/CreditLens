import logging
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).parent.parent / "data" / "loans.csv"
RANDOM_STATE = 42
TEST_SIZE = 0.2
TARGET = "defaulted"

NUMERIC_FEATURES = [
    "age", "income_monthly", "employment_years", "loan_amount", "interest_rate",
    "existing_loans", "debt_to_income", "credit_history_months", "has_collateral",
]
CATEGORICAL_FEATURES = ["gender", "employment_type", "loan_purpose", "province"]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def load_data(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = set(FEATURES + [TARGET]) - set(df.columns)
    assert not missing, f"Missing columns: {missing}"
    assert not df[FEATURES + [TARGET]].isna().any().any(), "Dataset contains nulls"
    assert set(df[TARGET].unique()) <= {True, False}, "Target must be binary"
    logger.info("Loaded %d rows, default rate %.3f", len(df), df[TARGET].mean())
    return df


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    return train_test_split(
        df[FEATURES], df[TARGET].astype(int),
        test_size=TEST_SIZE, stratify=df[TARGET], random_state=RANDOM_STATE,
    )


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer([
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ])


def original_feature(transformed_name: str) -> str:
    name = transformed_name.split("__", 1)[1]
    if name in NUMERIC_FEATURES:
        return name
    return next(f for f in CATEGORICAL_FEATURES if name.startswith(f + "_"))
