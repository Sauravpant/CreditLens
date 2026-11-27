import json
import logging

from fastapi import APIRouter, HTTPException, Request

from api.schemas import LoanApplication, ModelInfo, PredictionResponse
from model.predict import ARTIFACTS_DIR, load_artifacts, predict

logger = logging.getLogger(__name__)
router = APIRouter()


def _require_model(request: Request) -> None:
    if not request.app.state.model_ready:
        raise HTTPException(status_code=503, detail="Model not loaded. Run `make train` and restart the server.")


def _artifact(name: str) -> dict | list:
    return json.loads((ARTIFACTS_DIR / name).read_text())


@router.post("/predict", response_model=PredictionResponse)
def predict_risk(application: LoanApplication, request: Request) -> dict:
    _require_model(request)
    result = predict(application.model_dump())
    logger.info("Scored applicant: %s (%.4f)", result["risk_level"], result["risk_score"])
    return result


@router.get("/model/info", response_model=ModelInfo)
def model_info(request: Request) -> dict:
    _require_model(request)
    _, _, summary = load_artifacts()
    return {
        "best_model": summary["best_model"],
        "best_params": summary["best_params"],
        "cv_auc": summary["cv_auc"],
        "train_metrics": summary["train_metrics"],
        "test_metrics": summary["test_metrics"],
        "confusion_matrix": _artifact("metrics.json")["confusion_matrix"],
        "comparison": _artifact("comparison.json"),
        "global_importance": _artifact("global_importance.json"),
    }
