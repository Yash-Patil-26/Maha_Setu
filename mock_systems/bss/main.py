import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt

from fastapi import FastAPI, Form, Header, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel


app = FastAPI(
    title="SETU BSS Synthetic System",
    version="0.1.0",
)


BSS_API_TOKEN = os.getenv("BSS_API_TOKEN", "change-me")

BSS_WEBHOOK_SECRET = os.getenv("BSS_WEBHOOK_SECRET", "change-me")

HUB_WEBHOOK_URL = os.getenv(
    "HUB_WEBHOOK_URL",
    "http://127.0.0.1:8000/webhooks/bss",
)

SETU_SSO_SECRET = os.getenv("SETU_SSO_SECRET", "change-me")


def build_webhook_signature(body: bytes) -> str:
    digest = hmac.new(
        BSS_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return f"sha256={digest}"


def send_decision_webhook(
    bss_ref: str,
    decision: str,
    remarks: str | None,
) -> None:
    payload = {
        "specversion": "1.0",
        "id": f"evt-{bss_ref}-{decision.lower()}",
        "source": "bss",
        "type": "bss.application.decided",
        "subject": bss_ref,
        "time": datetime.now(timezone.utc).isoformat(),
        "data": {
            "decision": decision,
            "remarks": remarks,
        },
    }

    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "X-Signature": build_webhook_signature(body),
    }

    httpx.post(
        HUB_WEBHOOK_URL,
        content=body,
        headers=headers,
        timeout=5.0,
    )


applications: dict[str, dict[str, Any]] = {}
idempotency_store: dict[str, dict[str, Any]] = {}

next_bss_number = 1


class Applicant(BaseModel):
    master_id: str
    full_name: str
    dob: str
    mobile: str


class ApplicationRequest(BaseModel):
    applicant: Applicant
    scheme_code: str
    data: dict[str, Any]
    correlation_id: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"system": "BSS", "status": "ok"}


@app.post("/api/schemes/{scheme_code}/applications")
def submit_application(
    scheme_code: str,
    request: ApplicationRequest,
    authorization: str | None = Header(default=None),
    idempotency_key: str | None = Header(default=None),
) -> dict[str, str]:

    if authorization != f"Bearer {BSS_API_TOKEN}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED",
        )

    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IDEMPOTENCY_KEY_REQUIRED",
        )

    if idempotency_key in idempotency_store:
        return idempotency_store[idempotency_key]

    global next_bss_number

    bss_ref = f"BSS-2026-{next_bss_number:06d}"
    next_bss_number += 1

    response = {
        "bss_ref": bss_ref,
        "status": "RECEIVED",
    }

    applications[bss_ref] = {
        "bss_ref": bss_ref,
        "status": "RECEIVED",
        "remarks": None,
        "scheme_code": scheme_code,
        "request": request.model_dump(),
    }

    idempotency_store[idempotency_key] = response

    return response


@app.get("/api/applications/{bss_ref}")
def get_application_status(bss_ref: str) -> dict[str, Any]:
    application = applications.get(bss_ref)

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="APPLICATION_NOT_FOUND",
        )

    return {
        "bss_ref": application["bss_ref"],
        "status": application["status"],
        "remarks": application["remarks"],
    }


@app.post("/officer/applications/{bss_ref}/decision")
def officer_decision(
    bss_ref: str,
    decision: str = Form(...),
    remarks: str | None = Form(None),
) -> dict[str, Any]:

    application = applications.get(bss_ref)

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="APPLICATION_NOT_FOUND",
        )

    decision = decision.upper()

    if decision not in {"APPROVED", "REJECTED"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_DECISION",
        )

    application["status"] = decision
    application["remarks"] = remarks

    send_decision_webhook(
        bss_ref,
        decision,
        remarks,
    )

    return {
        "bss_ref": application["bss_ref"],
        "status": application["status"],
        "remarks": application["remarks"],
    }


def verify_sso_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            SETU_SSO_SECRET,
            algorithms=["HS256"],
            audience="bss",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_REQUIRED",
        )


@app.get("/sso")
def sso_login(token: str):
    verify_sso_token(token)

    from fastapi.responses import RedirectResponse

    response = RedirectResponse(url="/officer")

    response.set_cookie(
        key="bss_officer",
        value="1",
        httponly=True,
    )

    return response


@app.get("/officer", response_class=HTMLResponse)
def officer_page(request: Request):

    if request.cookies.get("bss_officer") != "1":
        return HTMLResponse(
            """
            <html>
            <body>
                <h2>BSS Officer Login</h2>

                <form method="post" action="/officer/login">
                    <label>Username:</label>
                    <input name="username" value="officer"><br><br>

                    <label>Password:</label>
                    <input name="password" type="password"><br><br>

                    <button type="submit">Login</button>
                </form>
            </body>
            </html>
            """,
            status_code=401,
        )

    rows = []

    for application in applications.values():
        rows.append(
            f"""
            <tr>
                <td>{application["bss_ref"]}</td>
                <td>{application["scheme_code"]}</td>
                <td>{application["status"]}</td>
                <td>{application["remarks"] or ""}</td>
                <td>
                    <form method="post"
                          action="/officer/applications/{application["bss_ref"]}/decision">

                        <input type="hidden"
                               name="decision"
                               value="APPROVED">

                        <input name="remarks"
                               placeholder="Remarks">

                        <button type="submit">
                            Approve
                        </button>
                    </form>

                    <form method="post"
                          action="/officer/applications/{application["bss_ref"]}/decision">

                        <input type="hidden"
                               name="decision"
                               value="REJECTED">

                        <input name="remarks"
                               placeholder="Remarks">

                        <button type="submit">
                            Reject
                        </button>
                    </form>
                </td>
            </tr>
            """
        )

    return HTMLResponse(
        f"""
        <html>
        <head>
            <title>BSS Officer</title>
        </head>

        <body>
            <h1>BSS Officer Queue</h1>

            <table border="1" cellpadding="8">
                <tr>
                    <th>BSS Ref</th>
                    <th>Scheme</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Decision</th>
                </tr>

                {''.join(rows)}

            </table>
        </body>
        </html>
        """
    )


@app.post("/officer/login")
async def officer_login(request: Request):

    form = await request.form()

    username = form.get("username")
    password = form.get("password")

    if username != "officer" or password != "change-me":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_REQUIRED",
        )

    from fastapi.responses import RedirectResponse

    response = RedirectResponse(
        url="/officer",
        status_code=status.HTTP_303_SEE_OTHER,
    )

    response.set_cookie(
        key="bss_officer",
        value="1",
        httponly=True,
    )

    return response