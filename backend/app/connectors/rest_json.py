from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin

import httpx

from .base import Connector
from .errors import (
    ConnectorConfigurationError,
    ConnectorResponseError,
    ConnectorTransportError,
)


class RestJsonConnector(Connector):
    """REST/JSON connector for destination-style submit operations."""

    def _build_url(self, scheme_code: str) -> str:
        base_url = self.config.get("base_url")
        path_template = self.config.get("path_template")

        if not base_url:
            raise ConnectorConfigurationError(
                f"{self.name}: missing config.base_url"
            )

        if not path_template:
            raise ConnectorConfigurationError(
                f"{self.name}: missing config.path_template"
            )

        try:
            path = path_template.format(scheme_code=scheme_code)
        except KeyError as exc:
            raise ConnectorConfigurationError(
                f"{self.name}: unsupported path template variable: {exc}"
            ) from exc

        return urljoin(
            f"{str(base_url).rstrip('/')}/",
            str(path).lstrip("/"),
        )

    def _headers(
        self,
        *,
        idempotency_key: str,
    ) -> dict[str, str]:
        auth = self.config.get("auth", {})

        if auth.get("type") != "bearer":
            raise ConnectorConfigurationError(
                f"{self.name}: REST_JSON requires bearer authentication"
            )

        secret_ref = auth.get("secret_ref")

        if not secret_ref:
            raise ConnectorConfigurationError(
                f"{self.name}: missing auth.secret_ref"
            )

        token = os.getenv(secret_ref)

        if not token:
            raise ConnectorConfigurationError(
                f"Environment variable {secret_ref!r} is not configured"
            )

        return {
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": idempotency_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        raise ConnectorConfigurationError(
            f"{self.name}: REST_JSON connector is submit-only"
        )

    def submit(
        self,
        *,
        applicant: dict[str, Any],
        scheme_code: str,
        data: dict[str, Any],
        application_id: int | str,
        step_id: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        if not scheme_code:
            raise ConnectorConfigurationError(
                f"{self.name}: scheme_code is required"
            )

        if not step_id:
            raise ConnectorConfigurationError(
                f"{self.name}: step_id is required"
            )

        if application_id is None or application_id == "":
            raise ConnectorConfigurationError(
                f"{self.name}: application_id is required"
            )

        if not isinstance(applicant, dict):
            raise ConnectorConfigurationError(
                f"{self.name}: applicant must be an object"
            )

        if not isinstance(data, dict):
            raise ConnectorConfigurationError(
                f"{self.name}: data must be an object"
            )

        idempotency_key = f"{application_id}:{step_id}"

        payload = {
            "applicant": applicant,
            "scheme_code": scheme_code,
            "data": data,
            "correlation_id": correlation_id,
        }

        url = self._build_url(scheme_code)
        timeout = float(self.config.get("timeout_seconds", 10))

        try:
            response = httpx.post(
                url,
                json=payload,
                headers=self._headers(
                    idempotency_key=idempotency_key,
                ),
                timeout=timeout,
            )
        except httpx.HTTPError as exc:
            raise ConnectorTransportError(
                f"{self.name}: BSS request failed: {exc}"
            ) from exc

        if response.status_code >= 400:
            raise ConnectorResponseError(
                f"{self.name}: BSS returned HTTP "
                f"{response.status_code}"
            )

        content_type = response.headers.get("content-type", "")

        if "json" not in content_type.lower():
            raise ConnectorResponseError(
                f"{self.name}: expected JSON response, "
                f"got {content_type!r}"
            )

        try:
            record = response.json()
        except ValueError as exc:
            raise ConnectorResponseError(
                f"{self.name}: invalid JSON response"
            ) from exc

        if not isinstance(record, dict):
            raise ConnectorResponseError(
                f"{self.name}: BSS response must be a JSON object"
            )

        bss_ref = record.get("bss_ref")
        status = record.get("status")

        if not bss_ref:
            raise ConnectorResponseError(
                f"{self.name}: BSS response missing bss_ref"
            )

        if not status:
            raise ConnectorResponseError(
                f"{self.name}: BSS response missing status"
            )

        return {
            "entity": self.entity,
            "record": record,
            "source_system": self.system_code,
            "connector_id": self.connector_id,
            "external_id": bss_ref,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "warnings": [],
        }
