import hashlib
import hmac
import os

from fastapi import FastAPI, Header, HTTPException, Request, status

app = FastAPI(
    title="SETU Hub",
    version="0.1.0",
)


WEBHOOK_SECRET = os.getenv("BSS_WEBHOOK_SECRET", "change-me")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/webhooks/{system_code}")
async def receive_webhook(
    system_code: str,
    request: Request,
    x_signature: str | None = Header(default=None),
) -> dict[str, str]:
    body = await request.body()

    if not x_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SIGNATURE_INVALID",
        )

    expected_signature = (
        "sha256="
        + hmac.new(
            WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
    )

    if not hmac.compare_digest(x_signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SIGNATURE_INVALID",
        )

    return {"status": "accepted"}