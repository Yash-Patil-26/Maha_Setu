from __future__ import annotations

import csv
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


class CsvConnector(Connector):
    """Read-only CSV connector for file-backed source systems."""

    def _file_path(self) -> Path:
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
                f"{self.name}: CSV file does not exist: {path}"
            )

        if not path.is_file():
            raise ConnectorConfigurationError(
                f"{self.name}: CSV path is not a file: {path}"
            )

        return path

    def _encoding(self) -> str:
        value = self.config.get("encoding", "utf-8-sig")
        if not isinstance(value, str) or not value.strip():
            raise ConnectorConfigurationError(
                f"{self.name}: invalid config.encoding"
            )
        return value

    def _delimiter(self) -> str:
        value = self.config.get("delimiter", ",")
        if not isinstance(value, str) or len(value) != 1:
            raise ConnectorConfigurationError(
                f"{self.name}: config.delimiter must be one character"
            )
        return value

    def _validate_lookup(self) -> tuple[str, str, str]:
        mobile_field = self.lookup.get("mobile_field")
        dob_field = self.lookup.get("dob_field")
        dob_format = self.lookup.get("dob_format")

        if not isinstance(mobile_field, str) or not mobile_field:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.mobile_field"
            )

        if not isinstance(dob_field, str) or not dob_field:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.dob_field"
            )

        if not isinstance(dob_format, str) or not dob_format:
            raise ConnectorConfigurationError(
                f"{self.name}: missing lookup.dob_format"
            )

        return mobile_field, dob_field, dob_format

    def _format_dob(self, dob: str, dob_format: str) -> str:
        if not isinstance(dob, str) or not dob.strip():
            raise ConnectorResponseError(f"{self.name}: dob is required")

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

    def _read_rows(self) -> list[dict[str, str]]:
        path = self._file_path()

        try:
            with path.open(
                "r",
                encoding=self._encoding(),
                newline="",
            ) as handle:
                reader = csv.DictReader(
                    handle,
                    delimiter=self._delimiter(),
                )

                if not reader.fieldnames:
                    raise ConnectorConfigurationError(
                        f"{self.name}: CSV has no header row"
                    )

                rows: list[dict[str, str]] = []

                for row in reader:
                    rows.append(
                        {
                            str(key).strip(): (
                                "" if value is None else str(value)
                            )
                            for key, value in row.items()
                        }
                    )

                return rows

        except ConnectorConfigurationError:
            raise
        except OSError as exc:
            raise ConnectorTransportError(
                f"{self.name}: failed to read CSV file"
            ) from exc
        except csv.Error as exc:
            raise ConnectorConfigurationError(
                f"{self.name}: invalid CSV data"
            ) from exc

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

        mobile_field, dob_field, dob_format = self._validate_lookup()
        lookup_dob = self._format_dob(dob, dob_format)
        rows = self._read_rows()

        matches = [
            row
            for row in rows
            if row.get(mobile_field, "").strip() == mobile.strip()
            and row.get(dob_field, "").strip() == lookup_dob
        ]

        if not matches:
            raise ConnectorResponseError(
                f"{self.name}: record not found"
            )

        if len(matches) > 1:
            raise ConnectorResponseError(
                f"{self.name}: multiple records matched the identity"
            )

        source = matches[0]
        record = apply_mapping(source, self.mapping)

        return {
            "entity": self.entity,
            "record": record,
            "source_system": self.system_code,
            "connector_id": self.connector_id,
            "external_id": record.get("trainee_id"),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "correlation_id": correlation_id,
            "warnings": [],
        }
