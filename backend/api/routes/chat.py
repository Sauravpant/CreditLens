import logging

from fastapi import APIRouter, HTTPException, Request

from agent.agent import answer
from agent.llm import AllProvidersFailed
from api.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, request: Request) -> dict:
    if not request.app.state.model_ready:
        raise HTTPException(status_code=503, detail="Model not loaded. Run `make train` and restart the server.")
    applicant = body.applicant.model_dump() if body.applicant else None
    try:
        return {"reply": answer(body.message, applicant)}
    except AllProvidersFailed as e:
        logger.error("%s", e)
        raise HTTPException(status_code=503, detail="All AI providers are unavailable. Try again later.") from e
    except Exception as e:
        logger.exception("Agent call failed")
        raise HTTPException(status_code=502, detail="The AI agent failed. Try again later.") from e
