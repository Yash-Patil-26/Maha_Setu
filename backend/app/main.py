from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
import hmac
import base64
import json
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from uuid import uuid4


# ---------------------------------------------------------
# App
# ---------------------------------------------------------

app = FastAPI(
    title="SETU Hub",
    version="0.1.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Database
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "setu.db"


def get_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    db = get_db()

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            master_id TEXT,
            locale TEXT DEFAULT 'en-IN',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            master_id TEXT NOT NULL,
            purpose TEXT NOT NULL,
            journey_id TEXT NOT NULL,
            granted_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked_at TEXT,
            status TEXT NOT NULL DEFAULT 'ACTIVE'
        )
        """
    )

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            master_id TEXT NOT NULL,
            journey_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'CREATED',
            correlation_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS systems (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_department TEXT NOT NULL,
            protocol TEXT NOT NULL,
            id_scheme TEXT NOT NULL,
            auth_type TEXT NOT NULL,
            health TEXT NOT NULL DEFAULT 'UP',
            simulate_down INTEGER NOT NULL DEFAULT 0
        )
        """
    )

    db.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            role TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    systems = [
        ("REV", "Revenue Department", "Revenue", "XML", "REV", "api_key"),
        ("EDU", "Education Department", "Education", "JSON", "EDU", "api_key"),
        ("SKL", "Skills & Employment", "Skills & Employment", "JSON", "SKL", "api_key"),
        ("BSS", "Benefit Scheme System", "Benefits", "JSON", "BSS", "api_key"),
    ]

    db.executemany(
        """
        INSERT OR IGNORE INTO systems
        (code, name, owner_department, protocol, id_scheme, auth_type)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        systems,
    )

    db.commit()
    db.close()


init_db()


# ---------------------------------------------------------
# Password hashing
# ---------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    )

    return (
        base64.b64encode(salt).decode()
        + "$"
        + base64.b64encode(password_hash).decode()
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_b64, hash_b64 = stored_hash.split("$", 1)

        salt = base64.b64decode(salt_b64)
        expected_hash = base64.b64decode(hash_b64)

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            200_000,
        )

        return hmac.compare_digest(actual_hash, expected_hash)

    except Exception:
        return False


# ---------------------------------------------------------
# Token
# ---------------------------------------------------------

TOKEN_SECRET = secrets.token_hex(32)


# ---------------------------------------------------------
# T-093 BSS Integration
# ---------------------------------------------------------

BSS_SSO_SECRET = secrets.token_hex(32)
BSS_WEBHOOK_SECRET = secrets.token_hex(32)


def create_bss_sso_token(application_id: int, officer_user_id: int) -> str:
    payload = {
        "iss": "SETU",
        "aud": "BSS",
        "sub": officer_user_id,
        "application_id": application_id,
        "jti": str(uuid4()),
        "exp": int(time.time()) + 15 * 60,
    }

    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(
            payload,
            separators=(",", ":"),
        ).encode()
    ).decode()

    signature = hmac.new(
        BSS_SSO_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{encoded_payload}.{signature}"


def verify_bss_sso_token(token: str) -> dict:
    if not token or "." not in token:
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_SSO_TOKEN",
        )

    encoded_payload, signature = token.rsplit(".", 1)

    expected_signature = hmac.new(
        BSS_SSO_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_SSO_TOKEN",
        )

    try:
        payload = json.loads(
            base64.urlsafe_b64decode(
                encoded_payload
                + "=" * (-len(encoded_payload) % 4)
            ).decode()
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_SSO_TOKEN",
        )

    if payload.get("iss") != "SETU":
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_SSO_ISSUER",
        )

    if payload.get("aud") != "BSS":
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_SSO_AUDIENCE",
        )

    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(
            status_code=401,
            detail="BSS_SSO_TOKEN_EXPIRED",
        )

    return payload


def create_bss_webhook_signature(payload: str) -> str:
    return hmac.new(
        BSS_WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()


def verify_bss_webhook_signature(
    payload: str,
    signature: str | None,
) -> bool:
    if not signature:
        return False

    expected = create_bss_webhook_signature(payload)

    return hmac.compare_digest(
        signature,
        expected,
    )


def create_token(user: sqlite3.Row) -> str:
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "exp": int(time.time()) + 60 * 60 * 8,
    }

    payload_json = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode()

    encoded_payload = base64.urlsafe_b64encode(
        payload_json
    ).decode()

    signature = hmac.new(
        TOKEN_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{encoded_payload}.{signature}"

def get_current_user(authorization: str | None, required_role: str = 'citizen'):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    token = authorization.split(" ", 1)[1].strip()

    if "." not in token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    encoded_payload, signature = token.rsplit(".", 1)

    expected_signature = hmac.new(
        TOKEN_SECRET.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    try:
        payload = json.loads(
            base64.urlsafe_b64decode(
                encoded_payload + "=" * (-len(encoded_payload) % 4)
            ).decode()
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(
            status_code=401,
            detail="Authentication token expired",
        )

    db = get_db()

    user = db.execute(
        """
        SELECT *
        FROM users
        WHERE id = ?
        """,
        (payload.get("sub"),),
    ).fetchone()

    db.close()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found",
        )

    if user["role"] != required_role:
        raise HTTPException(
            status_code=403,
            detail=f"{required_role.capitalize()} access required",
        )

    return user


def create_audit_log(
    user: dict | None,
    action: str,
    resource: str,
    status: str = "Success",
):
    db = get_db()

    try:
        db.execute(
            """
            INSERT INTO audit_logs (
                user_id,
                username,
                role,
                action,
                resource,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"] if user else None,
                user["username"] if user else "System",
                user["role"] if user else "System",
                action,
                resource,
                status,
                datetime.now().isoformat(timespec="seconds"),
            ),
        )

        db.commit()
    finally:
        db.close()

# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str
    display_name: str | None = None
    name: str | None = None
    locale: str = "en-IN"


class LoginRequest(BaseModel):
    username: str
    password: str
    role: str


class ConsentRequest(BaseModel):
    purpose: str
    journey_id: str


class ApplicationRequest(BaseModel):
    journey_id: str



class BSSDecisionRequest(BaseModel):
    sso_token: str
    decision: str
    reason: str | None = None
# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------
# T-092 Admin System Registry + Outage Simulation
# ---------------------------------------------------------

class SystemOutageRequest(BaseModel):
    down: bool


def serialize_system(row: sqlite3.Row) -> dict:
    return {
        "code": row["code"],
        "name": row["name"],
        "owner_department": row["owner_department"],
        "protocol": row["protocol"],
        "id_scheme": row["id_scheme"],
        "auth_type": row["auth_type"],
        "health": row["health"],
        "simulate_down": bool(row["simulate_down"]),
    }


@app.get("/api/systems")
def list_systems(
    authorization: str | None = Header(default=None),
):
    get_current_user(authorization, required_role="admin")

    db = get_db()
    try:
        rows = db.execute(
            """
            SELECT code, name, owner_department, protocol,
                   id_scheme, auth_type, health, simulate_down
            FROM systems
            ORDER BY code
            """
        ).fetchall()

        return [serialize_system(row) for row in rows]
    finally:
        db.close()

@app.get("/api/admin/audit")
def list_admin_audit(
    authorization: str | None = Header(default=None),
):
    get_current_user(authorization, required_role="admin")

    db = get_db()

    try:
        rows = db.execute(
            """
            SELECT
                id,
                username,
                role,
                action,
                resource,
                status,
                created_at
            FROM audit_logs
            ORDER BY id DESC
            LIMIT 200
            """
        ).fetchall()

        return [
            {
                "id": row["id"],
                "user": row["username"],
                "role": (
                    "Administrator"
                    if row["role"] == "admin"
                    else "Government Official"
                    if row["role"] == "officer"
                    else "Recruiter"
                    if row["role"] == "recruiter"
                    else "Citizen"
                    if row["role"] == "citizen"
                    else row["role"]
                ),
                "action": row["action"],
                "resource": row["resource"],
                "status": row["status"],
                "time": row["created_at"],
            }
            for row in rows
        ]
    finally:
        db.close()


@app.post("/api/systems/{code}/simulate-outage")
def simulate_system_outage(
    code: str,
    request: SystemOutageRequest,
    authorization: str | None = Header(default=None),
):
    user= get_current_user(authorization, required_role="admin")

    code = code.upper()

    if code not in {"REV", "EDU"}:
        raise HTTPException(
            status_code=400,
            detail="Outage simulation is supported only for REV and EDU",
        )

    db = get_db()

    try:
        row = db.execute(
            "SELECT * FROM systems WHERE code = ?",
            (code,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="System not found",
            )

        health = "DOWN" if request.down else "UP"

        db.execute(
            """
            UPDATE systems
            SET health = ?, simulate_down = ?
            WHERE code = ?
            """,
            (health, int(request.down), code),
        )

        db.commit()

        create_audit_log(
            user=user,
            action="System Outage Simulation" if request.down else "System Restore",
            resource=code,
            status="Success",
        )

        updated = db.execute(
            """
            SELECT code, name, owner_department, protocol,
                   id_scheme, auth_type, health, simulate_down
            FROM systems
            WHERE code = ?
            """,
            (code,),
        ).fetchone()

        return serialize_system(updated)
    finally:
        db.close()


# ---------------------------------------------------------
# Register
# ---------------------------------------------------------

@app.post("/api/auth/register")
def register(request: RegisterRequest):

    allowed_roles = {
        "citizen",
        "officer",
        "admin",
        "recruiter",
    }

    role = request.role.lower().strip()

    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role",
        )

    username = request.username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Username is required",
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters",
        )

    display_name = (
        request.display_name
        or request.name
        or username
    ).strip()

    db = get_db()

    existing_user = db.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,),
    ).fetchone()

    if existing_user:
        db.close()

        raise HTTPException(
            status_code=409,
            detail="Username already exists",
        )

    cursor = db.execute(
        """
        INSERT INTO users
        (
            display_name,
            username,
            password_hash,
            role,
            master_id,
            locale
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            display_name,
            username,
            hash_password(request.password),
            role,
            f"MASTER-{secrets.token_hex(4).upper()}",
            request.locale,
        ),
    )

    db.commit()

    user_id = cursor.lastrowid

    db.close()

    return {
        "message": "Registration successful",
        "user": {
            "id": user_id,
            "username": username,
            "display_name": display_name,
            "role": role,
            "locale": request.locale,
        },
    }


# ---------------------------------------------------------
# Login
# ---------------------------------------------------------

@app.post("/api/auth/login")
def login(request: LoginRequest):

    db = get_db()

    user = db.execute(
        """
        SELECT *
        FROM users
        WHERE username = ?
        """,
        (request.username.strip(),),
    ).fetchone()

    db.close()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    if not verify_password(
        request.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password",
        )

    if user["role"] != request.role.lower().strip():
        raise HTTPException(
            status_code=403,
            detail="Selected role does not match this account",
        )

    token = create_token(user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 28800,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "display_name": user["display_name"],
            "master_id": user["master_id"],
            "locale": user["locale"],
        },
    }

# ---------------------------------------------------------
# Citizen Consent
# ---------------------------------------------------------

@app.post("/api/consents", status_code=201)
def create_consent(
    request: ConsentRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user(authorization)

    journey_purposes = {
        "scholarship_v1": "scholarship_eligibility",
    }

    expected_purpose = journey_purposes.get(request.journey_id)

    if expected_purpose is None:
        raise HTTPException(
            status_code=404,
            detail="Journey not found",
        )

    if request.purpose != expected_purpose:
        raise HTTPException(
            status_code=400,
            detail="Invalid consent purpose for this journey",
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=30)

    db = get_db()

    existing = db.execute(
        """
        SELECT *
        FROM consents
        WHERE user_id = ?
          AND journey_id = ?
          AND status = 'ACTIVE'
          AND expires_at > ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (
            user["id"],
            request.journey_id,
            now.isoformat(),
        ),
    ).fetchone()

    if existing:
        db.close()

        return dict(existing)

    cursor = db.execute(
        """
        INSERT INTO consents
        (
            user_id,
            master_id,
            purpose,
            journey_id,
            granted_at,
            expires_at,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        """,
        (
            user["id"],
            user["master_id"],
            request.purpose,
            request.journey_id,
            now.isoformat(),
            expires_at.isoformat(),
        ),
    )

    db.commit()

    consent_id = cursor.lastrowid

    consent = db.execute(
        """
        SELECT *
        FROM consents
        WHERE id = ?
        """,
        (consent_id,),
    ).fetchone()

    db.close()

    return dict(consent)


# ---------------------------------------------------------
# Citizen Application
# ---------------------------------------------------------

@app.post("/api/applications", status_code=202)
def create_application(
    request: ApplicationRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user(authorization)

    now = datetime.now(timezone.utc)

    db = get_db()

    consent = db.execute(
        """
        SELECT *
        FROM consents
        WHERE user_id = ?
          AND journey_id = ?
          AND status = 'ACTIVE'
          AND expires_at > ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (
            user["id"],
            request.journey_id,
            now.isoformat(),
        ),
    ).fetchone()

    if not consent:
        db.close()

        raise HTTPException(
            status_code=403,
            detail="CONSENT_REQUIRED",
        )

    correlation_id = str(uuid4())

    cursor = db.execute(
        """
        INSERT INTO applications
        (
            user_id,
            master_id,
            journey_id,
            status,
            correlation_id,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, 'CREATED', ?, ?, ?)
        """,
        (
            user["id"],
            user["master_id"],
            request.journey_id,
            correlation_id,
            now.isoformat(),
            now.isoformat(),
        ),
    )

    db.commit()

    application_id = cursor.lastrowid

    db.close()

    return {
        "application_id": application_id,
        "status": "CREATED",
        "correlation_id": correlation_id,
    }
# ---------------------------------------------------------
# Officer Application APIs
# ---------------------------------------------------------

@app.get("/api/applications")
def list_applications(
    authorization: str | None = Header(default=None),
    limit: int = 50,
):
    get_current_user(authorization, required_role='officer')

    limit = max(1, min(limit, 100))

    db = get_db()

    applications = db.execute(
        """
        SELECT
            id,
            user_id,
            master_id,
            journey_id,
            status,
            correlation_id,
            created_at,
            updated_at
        FROM applications
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()

    db.close()

    return [dict(application) for application in applications]


@app.get("/api/applications/{application_id}")
def get_application(
    application_id: int,
    authorization: str | None = Header(default=None),
):
    user = get_current_user(authorization, required_role="citizen")

    db = get_db()

    application = db.execute(
        """
        SELECT
            id,
            user_id,
            master_id,
            journey_id,
            status,
            correlation_id,
            created_at,
            updated_at
        FROM applications
        WHERE id = ?
        """,
        (application_id,),
    ).fetchone()

    db.close()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="APPLICATION_NOT_FOUND",
        )

    if application["user_id"] != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only view your own application",
        )

    return dict(application)


# ---------------------------------------------------------
# T-093 BSS SSO / Decision / Webhook / Retry
# ---------------------------------------------------------

@app.post("/api/officer/applications/{application_id}/bss-sso-token")
def create_bss_sso_session(
    application_id: int,
    authorization: str | None = Header(default=None),
):
    officer = get_current_user(
        authorization,
        required_role="officer",
    )

    db = get_db()

    application = db.execute(
        """
        SELECT
            id,
            user_id,
            master_id,
            journey_id,
            status,
            correlation_id,
            created_at,
            updated_at
        FROM applications
        WHERE id = ?
        """,
        (application_id,),
    ).fetchone()

    db.close()

    if not application:
        raise HTTPException(
            status_code=404,
            detail="APPLICATION_NOT_FOUND",
        )

    if application["status"] in {
        "APPROVED",
        "REJECTED",
    }:
        raise HTTPException(
            status_code=409,
            detail="APPLICATION_ALREADY_DECIDED",
        )

    token = create_bss_sso_token(
        application_id=application_id,
        officer_user_id=officer["id"],
    )

    return {
        "application_id": application_id,
        "bss_reference": f"BSS-{application_id:06d}",
        "sso_token": token,
        "expires_in": 900,
        "status": application["status"],
    }


def process_bss_decision_webhook(
    payload: dict,
    signature: str | None,
):
    raw_payload = json.dumps(
        payload,
        separators=(",", ":"),
        sort_keys=True,
    )

    if not verify_bss_webhook_signature(
        raw_payload,
        signature,
    ):
        raise HTTPException(
            status_code=401,
            detail="INVALID_BSS_WEBHOOK_SIGNATURE",
        )

    application_id = payload.get("application_id")
    decision = payload.get("decision")

    if not application_id:
        raise HTTPException(
            status_code=400,
            detail="APPLICATION_ID_REQUIRED",
        )

    allowed_decisions = {
        "APPROVED",
        "REJECTED",
        "REVIEW",
        "PAUSED_EXCEPTION",
    }

    if decision not in allowed_decisions:
        raise HTTPException(
            status_code=400,
            detail="INVALID_BSS_DECISION",
        )

    status_map = {
        "APPROVED": "APPROVED",
        "REJECTED": "REJECTED",
        "REVIEW": "IN_REVIEW",
        "PAUSED_EXCEPTION": "PAUSED_EXCEPTION",
    }

    new_status = status_map[decision]
    now = datetime.now(timezone.utc).isoformat()

    db = get_db()

    application = db.execute(
        """
        SELECT id
        FROM applications
        WHERE id = ?
        """,
        (application_id,),
    ).fetchone()

    if not application:
        db.close()

        raise HTTPException(
            status_code=404,
            detail="APPLICATION_NOT_FOUND",
        )

    db.execute(
        """
        UPDATE applications
        SET
            status = ?,
            updated_at = ?
        WHERE id = ?
        """,
        (
            new_status,
            now,
            application_id,
        ),
    )

    db.commit()
    db.close()

    return {
        "application_id": application_id,
        "status": new_status,
        "decision": decision,
        "updated_at": now,
    }


@app.post("/api/webhooks/bss/decision")
def receive_bss_decision_webhook(
    payload: BSSDecisionRequest,
    x_bss_signature: str | None = Header(default=None),
):
    webhook_payload = {
        "application_id": None,
        "decision": payload.decision,
        "reason": payload.reason,
    }

    try:
        sso_payload = verify_bss_sso_token(
            payload.sso_token
        )
    except HTTPException:
        raise

    webhook_payload["application_id"] = sso_payload[
        "application_id"
    ]

    raw_payload = json.dumps(
        webhook_payload,
        separators=(",", ":"),
        sort_keys=True,
    )

    return process_bss_decision_webhook(
        webhook_payload,
        x_bss_signature,
    )


@app.post("/api/bss/decisions")
def bss_decision(
    request: BSSDecisionRequest,
):
    """
    Prototype BSS boundary.

    In production this endpoint represents the external
    BSS service. It validates the SETU SSO token and then
    sends a signed webhook back to SETU.
    """

    sso_payload = verify_bss_sso_token(
        request.sso_token
    )

    application_id = sso_payload["application_id"]

    webhook_payload = {
        "application_id": application_id,
        "decision": request.decision,
        "reason": request.reason,
    }

    raw_payload = json.dumps(
        webhook_payload,
        separators=(",", ":"),
        sort_keys=True,
    )

    signature = create_bss_webhook_signature(
        raw_payload
    )

    result = process_bss_decision_webhook(
        webhook_payload,
        signature,
    )

    return {
        "bss_reference": f"BSS-{application_id:06d}",
        "webhook_delivered": True,
        "result": result,
    }


@app.post("/api/officer/applications/{application_id}/retry")
def retry_paused_application(
    application_id: int,
    authorization: str | None = Header(default=None),
):
    officer = get_current_user(
        authorization,
        required_role="officer",
    )

    db = get_db()

    application = db.execute(
        """
        SELECT
            id,
            status
        FROM applications
        WHERE id = ?
        """,
        (application_id,),
    ).fetchone()

    if not application:
        db.close()

        raise HTTPException(
            status_code=404,
            detail="APPLICATION_NOT_FOUND",
        )

    if application["status"] != "PAUSED_EXCEPTION":
        db.close()

        raise HTTPException(
            status_code=409,
            detail="APPLICATION_NOT_PAUSED",
        )

    now = datetime.now(timezone.utc).isoformat()

    db.execute(
        """
        UPDATE applications
        SET
            status = 'SUBMITTED',
            updated_at = ?
        WHERE id = ?
        """,
        (
            now,
            application_id,
        ),
    )

    db.commit()
    db.close()

    token = create_bss_sso_token(
        application_id=application_id,
        officer_user_id=officer["id"],
    )

    return {
        "application_id": application_id,
        "status": "SUBMITTED",
        "message": "Application journey resumed",
        "sso_token": token,
        "expires_in": 900,
    }