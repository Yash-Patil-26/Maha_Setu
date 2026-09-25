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

def get_current_user(authorization: str | None):
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

    if user["role"] != "citizen":
        raise HTTPException(
            status_code=403,
            detail="Citizen access required",
        )

    return user
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

# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


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