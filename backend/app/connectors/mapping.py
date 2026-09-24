from __future__ import annotations

from datetime import datetime
from typing import Any

from .errors import MappingError


def _to_int(value: Any) -> int:
    if value is None:
        raise MappingError("Cannot convert empty value to integer")

    text = str(value).strip()
    if not text:
        raise MappingError("Cannot convert empty value to integer")

    normalized = text.replace("₹", "").replace(",", "").strip()

    try:
        number = float(normalized)
    except ValueError as exc:
        raise MappingError(
            f"Invalid integer value: {value!r}"
        ) from exc

    if not number.is_integer():
        raise MappingError(f"Non-zero fraction is not allowed: {value!r}")

    return int(number)


def _date(value: Any, input_format: str) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    try:
        return datetime.strptime(text, input_format).date().isoformat()
    except ValueError as exc:
        raise MappingError(
            f"Invalid date {value!r}; expected {input_format!r}"
        ) from exc


def _transform(value: Any, transform: Any) -> Any:
    if transform == "strip":
        return "" if value is None else str(value).strip()

    if transform == "upper":
        return "" if value is None else str(value).upper()

    if transform == "lower":
        return "" if value is None else str(value).lower()

    if transform == "title_case":
        return "" if value is None else str(value).strip().title()

    if transform == "to_int":
        return _to_int(value)

    if isinstance(transform, dict):
        if "date" in transform:
            return _date(value, transform["date"])

        if "enum" in transform:
            mapping = transform["enum"]
            key = "" if value is None else str(value).strip()

            if key not in mapping:
                raise MappingError(
                    f"Unmapped enum value: {key!r}"
                )

            return mapping[key]

        if "default" in transform:
            if value is None or str(value).strip() == "":
                return transform["default"]

            return value

    raise MappingError(f"Unsupported transform: {transform!r}")


def get_path(data: Any, path: str) -> Any:
    """Read a simple slash-separated path from nested dictionaries."""
    current = data

    for part in path.split("/"):
        if not part:
            continue

        if not isinstance(current, dict) or part not in current:
            return None

        current = current[part]

    return current


def apply_mapping(
    source: dict[str, Any],
    mapping: dict[str, Any],
) -> dict[str, Any]:
    """Map source fields into canonical fields."""
    result: dict[str, Any] = {}

    for target, definition in mapping.items():
        if isinstance(definition, str):
            source_path = definition
            transform = "strip"
        else:
            source_path = definition["source"]
            transform = definition.get("transform", "strip")

        value = get_path(source, source_path)

        if value is None and isinstance(transform, dict):
            if "default" in transform:
                value = transform["default"]

        result[target] = _transform(value, transform)

    return result
