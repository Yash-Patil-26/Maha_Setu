from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


def strip(value: Any) -> Any:
    if value is None:
        return None
    return str(value).strip()


def title_case(value: Any) -> Any:
    if value is None:
        return None
    return str(value).strip().title()


def to_int(value: Any) -> int | None:
    if value is None or str(value).strip() == "":
        return None

    text = str(value).strip()
    text = text.replace("₹", "").replace(",", "")

    number = float(text)
    if not number.is_integer():
        raise ValueError(f"Non-zero fraction cannot be converted to integer: {value!r}")

    return int(number)


def parse_date(value: Any, fmt: str = "%Y-%m-%d") -> date | None:
    if value is None or str(value).strip() == "":
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    return datetime.strptime(str(value).strip(), fmt).date()


def enum(
    value: Any,
    mapping: dict[str, str],
) -> str | None:
    if value is None or str(value).strip() == "":
        return None

    source = str(value).strip()
    normalized_mapping = {
        str(key).strip().upper(): str(target).strip()
        for key, target in mapping.items()
    }

    canonical = normalized_mapping.get(source.upper())
    if canonical is None:
        raise ValueError(f"Unmapped enum value: {value!r}")

    return canonical


@dataclass(frozen=True)
class MappingRule:
    source_field: str
    canonical_field: str
    transform: str
    options: dict[str, Any] | None = None


def apply_rule(
    rule: MappingRule,
    record: dict[str, Any],
) -> tuple[str, Any]:
    value = record.get(rule.source_field)

    if rule.transform == "strip":
        transformed = strip(value)
    elif rule.transform == "title_case":
        transformed = title_case(value)
    elif rule.transform == "to_int":
        transformed = to_int(value)
    elif rule.transform == "date":
        fmt = (rule.options or {}).get("format", "%Y-%m-%d")
        transformed = parse_date(value, fmt)
    elif rule.transform == "enum":
        mapping = (rule.options or {}).get("mapping", {})
        transformed = enum(value, mapping)
    else:
        raise ValueError(f"Unsupported transform: {rule.transform}")

    return rule.canonical_field, transformed


def apply_mapping(
    rules: list[MappingRule],
    record: dict[str, Any],
) -> dict[str, Any]:
    result: dict[str, Any] = {}

    for rule in rules:
        canonical_field, value = apply_rule(rule, record)
        result[canonical_field] = value

    return result
