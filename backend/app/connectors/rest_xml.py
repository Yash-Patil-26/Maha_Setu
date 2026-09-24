from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin
from xml.etree.ElementTree import Element

import httpx
from defusedxml import ElementTree

from .base import Connector
from .errors import (
    ConnectorConfigurationError,
    ConnectorResponseError,
    ConnectorTransportError,
)
from .mapping import apply_mapping


class RestXmlConnector(Connector):
    """REST/XML connector implementation."""

    def _build_url(self) -> str:
        base_url = self.config.get("base_url")
        path = self.config.get("path", "/certificates")

        if not base_url:
            raise ConnectorConfigurationError(
                f"{self.name}: missing config.base_url"
            )

        return urljoin(f"{base_url.rstrip('/')}/", path.lstrip("/"))

    def _headers(self) -> dict[str, str]:
        auth = self.config.get("auth", {})

        if auth.get("type") == "api_key":
            secret_ref = auth.get("secret_ref")
            if not secret_ref:
                raise ConnectorConfigurationError(
                    "REST_XML connector is missing auth.secret_ref"
                )

            api_key = os.getenv(secret_ref)
            if not api_key:
                raise ConnectorConfigurationError(
                    f"Environment variable {secret_ref!r} is not configured"
                )

            return {"X-API-Key": api_key}

        api_key = self.config.get("api_key")
        if api_key:
            return {"X-API-Key": api_key}

        raise ConnectorConfigurationError(
            "REST_XML connector requires API-key authentication"
        )

    def _xml_to_source(self, root: Element) -> dict[str, Any]:
        status = root.findtext("./Status")

        if status != "FOUND":
            raise ConnectorResponseError(
                f"REV returned unexpected status: {status!r}"
            )

        certificate = root.find("./IncomeCertificate")
        certificate_type = "INCOME"

        if certificate is None:
            certificate = root.find("./CasteCertificate")
            certificate_type = "CASTE"

        if certificate is None:
            raise ConnectorResponseError(
                "REV response does not contain a certificate"
            )

        source: dict[str, Any] = {
            "certificate_type": certificate_type,
            "CertNo": certificate.findtext("./CertNo"),
            "Holder": {
                "Name": certificate.findtext("./Holder/Name"),
            },
            "IssueDate": certificate.findtext("./IssueDate"),
            "ValidUntil": certificate.findtext("./ValidUntil"),
            "IssuingAuthority": certificate.findtext(
                "./IssuingAuthority"
            ),
            "IncomeDetails": {
                "AnnualIncome": certificate.findtext(
                    "./IncomeDetails/AnnualIncome"
                ),
            },
            "CasteDetails": {
                "Category": certificate.findtext(
                    "./CasteDetails/Category"
                ),
            },
        }

        return source

    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        url = self._build_url()

        params = {
            "type": self.lookup.get("certificate_type", "INCOME"),
            "mobile": mobile,
            "dob": dob,
        }

        timeout = float(self.config.get("timeout_seconds", 10))

        try:
            response = httpx.get(
                url,
                params=params,
                headers=self._headers(),
                timeout=timeout,
            )
        except httpx.HTTPError as exc:
            raise ConnectorTransportError(
                f"{self.name}: REV request failed: {exc}"
            ) from exc

        if response.status_code == 404:
            raise ConnectorResponseError(
                f"{self.name}: record not found"
            )

        if response.status_code >= 400:
            raise ConnectorResponseError(
                f"{self.name}: REV returned HTTP "
                f"{response.status_code}"
            )

        content_type = response.headers.get("content-type", "")

        if "xml" not in content_type.lower():
            raise ConnectorResponseError(
                f"{self.name}: expected XML response, "
                f"got {content_type!r}"
            )

        try:
            root = ElementTree.fromstring(response.content)
        except ElementTree.ParseError as exc:
            raise ConnectorResponseError(
                f"{self.name}: invalid XML response"
            ) from exc

        source = self._xml_to_source(root)
        record = apply_mapping(source, self.mapping)

        return {
            "entity": self.entity,
            "record": record,
            "source_system": self.system_code,
            "connector_id": self.connector_id,
            "external_id": None,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "warnings": [],
        }
