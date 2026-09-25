from __future__ import annotations

import hashlib
import hmac
import os
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Application, ApplicationStep

router = APIRouter(tags=["webhooks"])


class WebhookDecision(BaseModel):
    decision: str
    remarks: str | None = None


class WebhookEvent(BaseModel):
    specversion: str
    id: str
    source: str
    type: str
    subject: str
    time: str
    data: WebhookDecision


def _secret_for(system_code: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9_]", "_", system_code.upper())
    if not normalized:
        raise RuntimeError("Invalid webhook system code")

    env_name = f"WEBHOOK_HMAC_SECRET_{normalized}"
    secret = os.getenv(env_name)

    if not secret:
        raise RuntimeError(f"{env_name} is required")

    return secret


def _signature_is_valid(
    *,
    raw_body: bytes,
    provided_signature: str | None,
    secret: str,
) -> bool:
    if not provided_signature:
        return False

    prefix = "sha256="
    if not provided_signature.startswith(prefix):
        return False

    provided_digest = provided_signature[len(prefix):]

    if len(provided_digest) != hashlib.sha256().digest_size * 2:
        return False

    expected_digest = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(provided_digest, expected_digest)


def _find_application(
    db: Session,
    *,
    system_code: str,
    external_reference: str,
) -> Application | None:
    if system_code != "BSS":
        return None

    for application in db.query(Application).all():
        external_refs = application.external_refs_json or {}
        if external_refs.get("BSS") == external_reference:
            return application

    return None


@router.post("/webhooks/{system_code}")
async def receive_webhook(
    system_code: str,
    request: Request,
):
    raw_body = await request.body()

    secret = _secret_for(system_code)

    if not _signature_is_valid(
        raw_body=raw_body,
        provided_signature=request.headers.get("X-Signature"),
        secret=secret,
    ):
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "SIGNATURE_INVALID",
                }
            },
        )

    try:
        payload = WebhookEvent.model_validate_json(raw_body)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(exc),
                }
            },
        )

    decision = payload.data.decision.upper()

    if decision not in {"APPROVED", "REJECTED"}:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "decision must be APPROVED or REJECTED",
                }
            },
        )

    db = SessionLocal()

    try:
        application = _find_application(
            db,
            system_code=system_code.upper(),
            external_reference=payload.subject,
        )

        if application is None:
            return JSONResponse(
                status_code=404,
                content={
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Application for webhook subject was not found",
                    }
                },
            )

        metrics = dict(application.metrics_json or {})
        processed_event_ids = list(
            metrics.get("webhook_event_ids", [])
        )

        if payload.id in processed_event_ids:
            return JSONResponse(
                status_code=200,
                content={"status": "duplicate"},
            )

        now = datetime.now(timezone.utc)

        application.status = decision
        application.outcome = decision

        waiting_step = (
            db.query(ApplicationStep)
            .filter(
                ApplicationStep.application_id == application.id,
                ApplicationStep.status == "WAITING",
            )
            .order_by(ApplicationStep.id.desc())
            .first()
        )

        if waiting_step is not None:
            waiting_step.status = "DONE"
            waiting_step.ended_at = now
            waiting_step.output_json = {
                **(waiting_step.output_json or {}),
                "decision": decision,
                "remarks": payload.data.remarks,
                "event_id": payload.id,
                "event_time": payload.time,
            }

        processed_event_ids.append(payload.id)
        metrics["webhook_event_ids"] = processed_event_ids[-50:]

        metrics["last_webhook"] = {
            "event_id": payload.id,
            "system_code": system_code.upper(),
            "source": payload.source,
            "type": payload.type,
            "subject": payload.subject,
            "decision": decision,
            "remarks": payload.data.remarks,
            "received_at": now.isoformat(),
        }

        metrics["last_webhook_notification"] = {
            "id": f"webhook:{payload.id}",
            "title": (
                "Application approved"
                if decision == "APPROVED"
                else "Application rejected"
            ),
            "body": payload.data.remarks or "",
            "event_id": payload.id,
            "read": False,
            "created_at": now.isoformat(),
        }

        application.metrics_json = metrics

        db.commit()

        return JSONResponse(
            status_code=202,
            content={"status": "accepted"},
        )
    finally:
        db.close()
