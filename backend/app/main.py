from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.applications import router as applications_router
from .api.auth import router as auth_router
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health")
def api_health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(applications_router)
app.include_router(auth_router)
app.include_router(webhook_router)
