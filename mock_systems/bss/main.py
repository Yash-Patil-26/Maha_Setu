import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any

import httpx
import jwt

from fastapi import FastAPI, Form, Header, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel


app = FastAPI(
    title="SETU BSS Synthetic System",
    version="0.1.0",
)


BSS_API_TOKEN = os.getenv("BSS_API_TOKEN", "change-me")

WEBHOOK_HMAC_SECRET_BSS = os.getenv("WEBHOOK_HMAC_SECRET_BSS", "change-me")

HUB_WEBHOOK_URL = os.getenv(
    "HUB_WEBHOOK_URL",
    "http://127.0.0.1:8000/webhooks/bss",
)

SETU_SSO_SECRET = os.getenv("SETU_SSO_SECRET", "change-me")


def build_webhook_signature(body: bytes) -> str:
    digest = hmac.new(
        WEBHOOK_HMAC_SECRET_BSS.encode("utf-8"),
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


@app.post(
    "/api/schemes/{scheme_code}/applications",
    status_code=status.HTTP_201_CREATED,
)
def submit_application(
    scheme_code: str,
    request: ApplicationRequest,
    response: Response,
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
        response.status_code = status.HTTP_200_OK
        return idempotency_store[idempotency_key]

    correlation_id = request.correlation_id.strip()
    if not correlation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CORRELATION_ID_REQUIRED",
        )

    bss_ref = (
        "BSS-2026-"
        + hashlib.sha256(correlation_id.encode("utf-8")).hexdigest()[:12].upper()
    )

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



BSS_OFFICER_CSS = r"""
<style>
:root {
    color-scheme: light;
    font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
}

html,
body {
    min-height: 100%;
}

body.bss-page {
    margin: 0;
    min-height: 100vh;
    background: linear-gradient(180deg, #f4f8fd 0%, #eef3f9 100%);
    color: #132238;
    overflow-x: auto;
}

.bss-shell {
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
    padding: 34px 0 48px;
}

.bss-external-banner {
    margin-bottom: 14px;
    padding: 10px 14px;
    border: 1px solid #d6e3f2;
    border-radius: 10px;
    background: #f4f8fd;
    color: #52677f;
    font-size: 12px;
    line-height: 1.5;
}

.bss-external-banner strong {
    color: #173b72;
}

.bss-login-card {
    max-width: 520px;
    margin: 64px auto;
    padding: 28px;
    background: #ffffff;
    border: 1px solid #dbe5f0;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(20, 54, 95, 0.07);
}

.bss-login-card h1 {
    margin: 0 0 8px;
    color: #12366f;
    font-size: 28px;
}

.bss-login-card p {
    margin: 0 0 20px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.5;
}

.bss-login-card label {
    display: block;
    margin: 0 0 6px;
    color: #40536b;
    font-size: 12px;
    font-weight: 700;
}

.bss-login-card input {
    box-sizing: border-box;
    width: 100%;
    margin: 0 0 16px;
    padding: 10px 12px;
    border: 1px solid #c9d6e5;
    border-radius: 8px;
    background: #ffffff;
    color: #22334a;
    font: inherit;
}

.bss-login-card input:focus {
    border-color: #4d8edc;
    outline: none;
    box-shadow: 0 0 0 3px rgba(77, 142, 220, 0.12);
}

.bss-login-card button {
    min-height: 38px;
    padding: 9px 16px;
    border: 1px solid #1769b5;
    border-radius: 8px;
    background: #1769b5;
    color: #ffffff;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
}

.bss-login-card button:hover {
    background: #145a9a;
}

.bss-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
    padding: 24px 26px;
    background: #ffffff;
    border: 1px solid #dbe5f0;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(20, 54, 95, 0.07);
}

.bss-eyebrow {
    display: block;
    margin-bottom: 7px;
    color: #2767bd;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.bss-header h1 {
    margin: 0;
    color: #12366f;
    font-size: clamp(28px, 4vw, 36px);
    line-height: 1.1;
    letter-spacing: -0.02em;
}

.bss-header p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.5;
}

.bss-badge {
    flex: 0 0 auto;
    padding: 8px 12px;
    border: 1px solid #c9dbf2;
    border-radius: 999px;
    background: #edf5ff;
    color: #245fae;
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
}

.bss-card {
    background: #ffffff;
    border: 1px solid #dbe5f0;
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(20, 54, 95, 0.06);
    overflow: hidden;
}

.bss-card-heading {
    padding: 22px 24px 16px;
    border-bottom: 1px solid #e7eef6;
}

.bss-card-heading h2 {
    margin: 0 0 5px;
    color: #173b72;
    font-size: 19px;
}

.bss-card-heading p {
    margin: 0;
    color: #718096;
    font-size: 13px;
}

.bss-table-wrap {
    overflow-x: auto;
}

.bss-table {
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
    background: #ffffff;
}

.bss-table th {
    padding: 13px 16px;
    background: #f6f9fc;
    border-bottom: 1px solid #dbe5f0;
    color: #5c7088;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-align: left;
    text-transform: uppercase;
}

.bss-table td {
    padding: 16px;
    border-bottom: 1px solid #e7eef6;
    color: #24364d;
    font-size: 13px;
    vertical-align: middle;
}

.bss-table tr:last-child td {
    border-bottom: 0;
}

.bss-table tbody tr:hover {
    background: #fbfdff;
}

.bss-status {
    display: inline-flex;
    align-items: center;
    padding: 5px 9px;
    border-radius: 999px;
    background: #edf5ff;
    border: 1px solid #cfe0f5;
    color: #255da6;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
}

.bss-decision-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0 0 8px;
}

.bss-decision-form:last-child {
    margin-bottom: 0;
}

.bss-decision-form input[name="remarks"] {
    min-width: 190px;
    padding: 9px 10px;
    border: 1px solid #c9d6e5;
    border-radius: 8px;
    background: #ffffff;
    color: #22334a;
    font: inherit;
    font-size: 12px;
    outline: none;
}

.bss-decision-form input[name="remarks"]:focus {
    border-color: #4d8edc;
    box-shadow: 0 0 0 3px rgba(77, 142, 220, 0.12);
}

.bss-button {
    min-height: 36px;
    padding: 8px 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    color: #ffffff;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
}

.bss-button:hover {
    filter: brightness(0.97);
    transform: translateY(-1px);
}

.bss-button.approve {
    background: #18865a;
    border-color: #18865a;
}

.bss-button.reject {
    background: #c63f4a;
    border-color: #c63f4a;
}

.bss-footer {
    margin-top: 18px;
    padding: 0 4px;
    color: #8a9aad;
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
}

@media (max-width: 760px) {
    .bss-shell {
        width: min(100% - 24px, 1180px);
        padding-top: 18px;
    }

    .bss-header {
        flex-direction: column;
        padding: 20px;
    }

    .bss-badge {
        align-self: flex-start;
    }
}
</style>
"""

@app.post("/officer/applications/{bss_ref}/decision")
def officer_decision(
    bss_ref: str,
    request: Request,
    decision: str = Form(...),
    remarks: str | None = Form(None),
) -> dict[str, Any]:
    if request.cookies.get("bss_officer") != "1":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTH_REQUIRED",
        )

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
            <head>
                <meta charset="utf-8">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                >
                <title>Benefit Scheme System · Officer Sign In</title>
                {BSS_OFFICER_CSS}
            </head>
            <body class="bss-page">
                <div class="bss-shell">
                    <div class="bss-external-banner">
                        <strong>MAHA SETU</strong> has opened the connected
                        scheme system for this review. You are leaving the
                        MAHA SETU workspace and entering the benefit service.
                    </div>

                    <section class="bss-login-card">
                        <span class="bss-eyebrow">
                            Connected Benefit Service
                        </span>

                        <h1>Officer sign in</h1>

                        <p>
                            Continue to the benefit scheme decision workspace.
                        </p>

                        <form method="post" action="/officer/login">
                            <label for="bss-username">Username</label>
                            <input
                                id="bss-username"
                                name="username"
                                value="officer"
                                autocomplete="username"
                            >

                            <label for="bss-password">Password</label>
                            <input
                                id="bss-password"
                                name="password"
                                type="password"
                                autocomplete="current-password"
                            >

                            <button type="submit">
                                Continue
                            </button>
                        </form>
                    </section>
                </div>
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
                <td>
                    <span class="bss-status">{application["status"]}</span>
                </td>
                <td>{application["remarks"] or ""}</td>
                <td>
                    <form class="bss-decision-form"
                          method="post"
                          action="/officer/applications/{application["bss_ref"]}/decision">

                        <input type="hidden"
                               name="decision"
                               value="APPROVED">

                        <input name="remarks"
                               placeholder="Remarks">

                        <button
                            class="bss-button approve"
                            type="submit"
                        >
                            Approve
                        </button>
                    </form>

                    <form class="bss-decision-form"
                          method="post"
                          action="/officer/applications/{application["bss_ref"]}/decision">

                        <input type="hidden"
                               name="decision"
                               value="REJECTED">

                        <input name="remarks"
                               placeholder="Remarks">

                        <button
                            class="bss-button reject"
                            type="submit"
                        >
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
            <meta charset="utf-8">
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
            >
            <title>Benefit Scheme System</title>
            {BSS_OFFICER_CSS}
        </head>

        <body class="bss-page">
            <div class="bss-shell">
                <div class="bss-external-banner">
                    <strong>MAHA SETU</strong> connected you to this scheme
                    system for the current application review.
                </div>

                <header class="bss-header">
                    <div>
                        <span class="bss-eyebrow">
                            Connected Benefit Service
                        </span>

                        <h1>Benefit Scheme System</h1>

                        <p>
                            Officer decision workspace connected through
                            MAHA SETU.
                        </p>
                    </div>

                    <span class="bss-badge">
                        Officer Workspace
                    </span>
                </header>

                <section class="bss-card">
                    <div class="bss-card-heading">
                        <h2>Application Decision Queue</h2>

                        <p>
                            Review submitted benefit applications and record
                            the decision.
                        </p>
                    </div>

                    <div class="bss-table-wrap">
                        <table class="bss-table">
                            <thead>
                                <tr>
                                    <th>BSS Reference</th>
                                    <th>Scheme</th>
                                    <th>Status</th>
                                    <th>Remarks</th>
                                    <th>Decision</th>
                                </tr>
                            </thead>

                            <tbody>
                                {''.join(rows)}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div class="bss-footer">
                    Synthetic interoperability workspace ·
                    MAHA SETU conceptual prototype ·
                    Not an official government site
                </div>
            </div>
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