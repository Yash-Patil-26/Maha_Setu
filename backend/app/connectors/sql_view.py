from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .base import Connector
from .errors import (
    ConnectorConfigurationError,
    ConnectorResponseError,
    ConnectorTransportError,
)
from .mapping import apply_mapping


class SqlViewConnector(Connector):
    """Read-only SQLite connector for legacy SQL_VIEW sources."""

    def _database_path(self) -> Path:
        file_value = self.config.get("file")

        if not isinstance(file_value, str) or not file_value.strip():
            raise ConnectorConfigurationError(
                f"{self.name}: missing config.file"
            )

        path = Path(file_value)

        if not path.is_absolute():
            project_root = Path(__file__).resolve().parents[3]
            path = project_root / path

        path = path.resolve()

        if not path.exists():
            raise ConnectorTransportError(
                f"{self.name}: database file does not exist: {path}"
            )

        if not path.is_file():
            raise ConnectorConfigurationError(
                f"{self.name}: database path is not a file: {path}"
            )

        return path

    def _query(self) -> str:
        query = self.config.get("query")

        if not isinstance(query, str) or not query.strip():
            raise ConnectorConfigurationError(
                f"{self.name}: missing config.query"
            )

        normalized = query.strip()

        if not normalized.lower().startswith("select "):
            raise ConnectorConfigurationError(
                f"{self.name}: SQL_VIEW query must be a SELECT"
            )

        if ";" in normalized:
            raise ConnectorConfigurationError(
                f"{self.name}: SQL_VIEW query must not contain ';'"
            )

        if ":mobile" not in normalized or ":dob" not in normalized:
            raise ConnectorConfigurationError(
                f"{self.name}: SQL_VIEW query must use :mobile and :dob"
            )

        return normalized

    def _format_dob(self, dob: str) -> str:
        dob_format = self.lookup.get("dob_format")

        if not isinstance(dob_format, str) or not dob_format:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.dob_format"
            )

        if not isinstance(dob, str) or not dob.strip():
            raise ConnectorResponseError(
                f"{self.name}: dob is required"
            )

        value = dob.strip()

        try:
            datetime.strptime(value, dob_format)
            return value
        except ValueError:
            pass

        try:
            return datetime.fromisoformat(value).strftime(dob_format)
        except ValueError as exc:
            raise ConnectorResponseError(
                f"{self.name}: invalid DOB {dob!r}; "
                f"expected ISO date or {dob_format!r}"
            ) from exc

    def _validate_lookup(self) -> None:
        mobile_field = self.lookup.get("mobile_field")
        dob_field = self.lookup.get("dob_field")

        if not isinstance(mobile_field, str) or not mobile_field:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.mobile_field"
            )

        if not isinstance(dob_field, str) or not dob_field:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.dob_field"
            )

    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        if not isinstance(mobile, str) or not mobile.strip():
            raise ConnectorResponseError(
                f"{self.name}: mobile is required"
            )

        if not isinstance(correlation_id, str) or not correlation_id:
            raise ConnectorResponseError(
                f"{self.name}: correlation_id is required"
            )

        self._validate_lookup()

        query = self._query()
        lookup_dob = self._format_dob(dob)
        database_path = self._database_path()

        uri = f"file:{database_path.as_posix()}?mode=ro"

        try:
            connection = sqlite3.connect(uri, uri=True)
        except sqlite3.Error as exc:
            raise ConnectorTransportError(
                f"{self.name}: failed to open legacy database"
            ) from exc

        connection.row_factory = sqlite3.Row

        try:
            connection.execute("PRAGMA query_only = TRUE")

            try:
                cursor = connection.execute(
                    query,
                    {
                        "mobile": mobile.strip(),
                        "dob": lookup_dob,
                    },
                )
                rows = cursor.fetchmany(2)
            except sqlite3.Error as exc:
                raise ConnectorConfigurationError(
                    f"{self.name}: SQL_VIEW query failed"
                ) from exc
        finally:
            connection.close()

        if not rows:
            raise ConnectorResponseError(
                f"{self.name}: record not found"
            )

        if len(rows) > 1:
            raise ConnectorResponseError(
                f"{self.name}: multiple records matched the identity"
            )

        source = dict(rows[0])
        record = apply_mapping(source, self.mapping)

        return {
            "entity": self.entity,
            "record": record,
            "source_system": self.system_code,
            "connector_id": self.connector_id,
            "external_id": record.get("enrolment_id"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "warnings": [],
        }
