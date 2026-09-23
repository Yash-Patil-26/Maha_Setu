import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import bcrypt
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

HUB_TOKEN_TTL_HOURS = 8
SSO_TOKEN_TTL_MINUTES = 5
SSO_AUDIENCE = "bss"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _jwt_secret() -> str:
    value = os.getenv("SETU_SSO_SECRET")
    if not value:
        raise RuntimeError("SETU_SSO_SECRET is required")
    return value


def _bss_base_url() -> str:
    value = os.getenv("BSS_BASE_URL")
    if not value:
        raise RuntimeError("BSS_BASE_URL is required")

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise RuntimeError(
            "BSS_BASE_URL must be an absolute HTTP(S) URL"
        )

    return value.rstrip("/")


def _default_locale() -> str:
    value = os.getenv("SETU_DEFAULT_LOCALE")
    if not value:
        raise RuntimeError("SETU_DEFAULT_LOCALE is required")
    return value


def _jwt_issuer() -> str:
    return os.getenv("JWT_ISSUER", "setu")


def _jwt_audience() -> str:
    return os.getenv("JWT_AUDIENCE", "setu-demo")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def _create_hub_token(user: User) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=HUB_TOKEN_TTL_HOURS)

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "master_id": user.master_id,
        "name": user.display_name,
        "exp": expires_at,
    }

    token = jwt.encode(
        payload,
        _jwt_secret(),
        algorithm="HS256",
    )
    return token, HUB_TOKEN_TTL_HOURS * 60 * 60


def _create_sso_token(user: User) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=SSO_TOKEN_TTL_MINUTES)

    payload = {
        "iss": "setu-hub",
        "sub": str(user.id),
        "aud": SSO_AUDIENCE,
        "role": user.role,
        "name": user.display_name,
        "iat": now,
        "exp": expires_at,
    }

    token = jwt.encode(
        payload,
        _jwt_secret(),
        algorithm="HS256",
    )
    return token, SSO_TOKEN_TTL_MINUTES * 60


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    display_name: str
    master_id: str | None
    locale: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse


class SsoTokenRequest(BaseModel):
    audience: str


class SsoTokenResponse(BaseModel):
    url: str
    expires_in: int


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "AUTH_REQUIRED",
                "message": "Invalid username or password",
            }
        },
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = db.query(User).filter(User.username == payload.username).first()

    if user is None or not _verify_password(
        payload.password,
        user.password_hash,
    ):
        raise _auth_error()

    token, expires_in = _create_hub_token(user)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
            display_name=user.display_name,
            master_id=user.master_id,
            locale=_default_locale(),
        ),
    )


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise _auth_error()

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=["HS256"],
        )
    except jwt.PyJWTError:
        raise _auth_error()

    subject = payload.get("sub")
    if not subject:
        raise _auth_error()

    user = db.get(User, int(subject))
    if user is None:
        raise _auth_error()

    return user


def require_roles(*roles: str):
    def dependency(
        user: User = Depends(get_current_user),
    ) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Insufficient role",
                    }
                },
            )
        return user

    return dependency


@router.post(
    "/sso-token",
    response_model=SsoTokenResponse,
)
def issue_sso_token(
    payload: SsoTokenRequest,
    user: User = Depends(require_roles("officer", "admin")),
) -> SsoTokenResponse:
    if payload.audience != SSO_AUDIENCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": 'audience must be "bss"',
                }
            },
        )

    token, expires_in = _create_sso_token(user)

    return SsoTokenResponse(
        url=f"{_bss_base_url()}/sso?token={token}",
        expires_in=expires_in,
    )
