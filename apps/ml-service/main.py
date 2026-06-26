"""
apps/ml-service/main.py

FastAPI ML Service — loads ONNX models once at startup and exposes HTTP
endpoints for the Node.js ml-worker to call.

Endpoints:
  GET  /health      — liveness / readiness probe
  POST /onboard     — extract MobileFaceNet embeddings from image URLs
  POST /train       — trigger full training pipeline for a section (async)
  GET  /train/{job_id} — poll training job status
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from dotenv import load_dotenv

load_dotenv()

from routers import onboarding, training
from core.model_registry import model_registry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("ml-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ONNX models into memory once at startup."""
    logger.info("=== ML Service starting up ===")
    model_registry.load_all()
    logger.info("=== Models loaded — service ready ===")
    yield
    logger.info("=== ML Service shutting down ===")


app = FastAPI(
    title="School AI — ML Service",
    description=(
        "Internal FastAPI service for face embedding extraction "
        "and classifier training. Called by the Node.js ml-worker."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # internal service — allow all
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding.router, prefix="/onboard", tags=["Onboarding"])
app.include_router(training.router, prefix="/train", tags=["Training"])


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness / readiness probe used by Docker and the ml-worker."""
    return {
        "status": "ok",
        "detector_ready": model_registry.detector_ready,
        "extractor_ready": model_registry.extractor_ready,
    }
