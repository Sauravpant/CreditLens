from typing import Literal

from pydantic import BaseModel, Field

EmploymentType = Literal["Government", "Private", "Self-employed", "Agriculture"]
LoanPurpose = Literal["Agriculture", "Business", "Personal", "Education", "Housing"]


class LoanApplication(BaseModel):
    age: int = Field(ge=18, le=80)
    gender: Literal["M", "F"]
    income_monthly: float = Field(gt=0, le=10_000_000, description="NPR per month")
    employment_type: EmploymentType
    employment_years: int = Field(ge=0, le=62)
    loan_amount: float = Field(gt=0, le=1_000_000_000, description="NPR")
    loan_purpose: LoanPurpose
    interest_rate: float = Field(gt=0, le=30, description="Annual %, e.g. 12.5")
    existing_loans: int = Field(ge=0, le=20)
    has_collateral: bool
    credit_history_months: int = Field(ge=0, le=744)
    province: int = Field(ge=1, le=7, description="1 Koshi ... 7 Sudurpashchim")

    model_config = {
        "json_schema_extra": {
            "example": {
                "age": 28, "gender": "M", "income_monthly": 45000, "employment_type": "Government",
                "employment_years": 5, "loan_amount": 500000, "loan_purpose": "Personal", "interest_rate": 12.0,
                "existing_loans": 1, "has_collateral": False, "credit_history_months": 72, "province": 3,
            }
        }
    }


class TopFactor(BaseModel):
    feature: str
    impact: float
    direction: Literal["increases risk", "decreases risk"]


class PredictionResponse(BaseModel):
    risk_score: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    top_factors: list[TopFactor]
    contributions: list[TopFactor]
    debt_to_income: float
    explanation: str
    model_used: str


class ModelInfo(BaseModel):
    best_model: str
    best_params: dict
    cv_auc: float
    train_metrics: dict
    test_metrics: dict
    confusion_matrix: list[list[int]]
    comparison: list[dict]
    global_importance: dict[str, float]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    applicant: LoanApplication | None = None


class ChatResponse(BaseModel):
    reply: str
