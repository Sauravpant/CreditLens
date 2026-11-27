import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import chat, predict
from model.predict import load_artifacts

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("creditlens")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    try:
        _, _, summary = load_artifacts()
        app.state.model_ready = True
        logger.info("Loaded model: %s", summary["model_used"])
    except FileNotFoundError:
        app.state.model_ready = False
        logger.error("Model artifacts missing. Run `make train`. /predict will return 503.")
    yield


app = FastAPI(title="CreditLens API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(predict.router)
app.include_router(chat.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": app.state.model_ready}
