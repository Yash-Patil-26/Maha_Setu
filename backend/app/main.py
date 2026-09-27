from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.applications import router as applications_router
from .api.auth import router as auth_router
from .api.connectors import router as connectors_router
from .api.consents import router as consents_router
from .api.metrics import router as metrics_router
from .api.systems import router as systems_router
from .api.webhook import router as webhook_router
from .db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SETU Hub",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(applications_router)
app.include_router(auth_router)
app.include_router(consents_router)
app.include_router(connectors_router)
app.include_router(webhook_router)

app.include_router(metrics_router)
app.include_router(systems_router)
