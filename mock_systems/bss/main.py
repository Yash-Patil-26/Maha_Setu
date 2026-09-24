from __future__ import annotations

import os
import secrets
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Response, status
from pydantic import BaseModel, Field

app = FastAPI(
    title="SETU BSS Synthetic System",
    version="0.1.0",
)

BSS_API_TOKEN = os.getenv("BSS_API_TOKEN", "change-me")
ALLOWED_SCHEMES = {"SCHOL-PM", "STARTUP-YOUTH"}

_applications: dict[str, dict[str, Any]] = {}
_idempotency: dict[str, dict[str, str]] = {}
_next_reference = 1


class Applicant(BaseModel):
    master_id: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    dob: str = Field(min_length=1)
    mobile: str = Field(min_length=1)


class SubmitApplicationRequest(BaseModel):
    applicant: Applicant
    scheme_code: str = Field(min_length=1)
    data: dict[str, Any]
    correlation_id: str = Field(min_length=1)


class SubmitApplicationResponse(BaseModel):
    bss_ref: str
    status: str


def _require_bearer(authorization: str | None) -> None:
    expected = f"Bearer {BSS_API_TOKEN}"

    if not authorization or not secrets.compare_digest(
        authorization,
        expected,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid BSS API token",
        )


def _new_bss_ref() -> str:
    global _next_reference

    reference = f"BSS-2026-{_next_reference:06d}"
    _next_reference += 1
    return reference


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "system": "BSS",
        "status": "ok",
    }


@app.post(
    "/api/schemes/{scheme_code}/applications",
    response_model=SubmitApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_application(
    scheme_code: str,
    payload: SubmitApplicationRequest,
    response: Response,
    authorization: str | None = Header(default=None),
    idempotency_key: str | None = Header(default=None),
) -> SubmitApplicationResponse:
    _require_bearer(authorization)

    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required",
        )

    if scheme_code not in ALLOWED_SCHEMES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown scheme: {scheme_code}",
        )

    if payload.scheme_code != scheme_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path scheme_code does not match payload scheme_code",
        )

    cached = _idempotency.get(idempotency_key)

    if cached is not None:
        response.status_code = status.HTTP_200_OK
        return SubmitApplicationResponse(**cached)

    bss_ref = _new_bss_ref()

    result = {
        "bss_ref": bss_ref,
        "status": "RECEIVED",
    }

    _idempotency[idempotency_key] = result

    _applications[bss_ref] = {
        "bss_ref": bss_ref,
        "status": "RECEIVED",
        "remarks": None,
    }

    return SubmitApplicationResponse(**result)


@app.get("/api/applications/{bss_ref}")
def get_application(
    bss_ref: str,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    _require_bearer(authorization)

    application = _applications.get(bss_ref)

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BSS application not found",
        )

    return application
