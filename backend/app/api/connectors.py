from __future__ import annotations

import json
import re
import time
from copy import deepcopy
from datetime import date, datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors.csv import CsvConnector
from ..connectors.errors import (
    ConnectorConfigurationError,
    ConnectorError,
    ConnectorResponseError,
    ConnectorTransportError,
    MappingError,
)
from ..connectors.factory import build_connector
from ..db import SessionLocal
from ..models import Connector, JourneyDef, System, User
from .auth import require_roles

router = APIRouter(
    prefix="/api/connectors",
    tags=["connectors"],
)

CANONICAL_PATH = (
    Path(__file__).resolve().parents[1] / "canonical" / "entities.json"
)

SUPPORTED_KINDS = {"REST_JSON", "REST_XML", "SQL_VIEW", "CSV"}


class IdentitySample(BaseModel):
    mobile: str
    dob: str


class ConnectorCreateRequest(BaseModel):
    system_code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    entity: str = Field(min_length=1)
    config: dict[str, Any] = Field(default_factory=dict)
    lookup: dict[str, Any] = Field(default_factory=dict)
    auth: dict[str, Any] = Field(default_factory=dict)


class ConnectorMappingRequest(BaseModel):
    mapping: dict[str, Any]
    validators: list[dict[str, Any]] = Field(default_factory=list)


class ConnectorTestRequest(BaseModel):
    mapping: dict[str, Any] | None = None
    identity_sample: IdentitySample


class ConnectorActivateRequest(BaseModel):
    journey_id: str = Field(min_length=1)
    step_id: str = Field(min_length=1)


class ConnectorSampleRequest(BaseModel):
    identity_sample: IdentitySample | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _canonical_entities() -> dict[str, Any]:
    try:
        return json.loads(CANONICAL_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Canonical entity schema cannot be loaded") from exc


def _canonical_fields(entity: str) -> list[dict[str, Any]]:
    document = _canonical_entities()
    entities = document.get("entities")

    if not isinstance(entities, dict):
        raise RuntimeError("Canonical entity document has no entities object")

    definition = entities.get(entity)

    if not isinstance(definition, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unknown canonical entity",
        )

    fields = definition.get("fields")

    if not isinstance(fields, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="canonical entity has no fields",
        )

    return fields


def _serialize_connector(row: Connector) -> dict[str, Any]:
    return {
        "id": row.id,
        "system_code": row.system_code,
        "name": row.name,
        "kind": row.kind,
        "entity": row.entity,
        "config": row.config_json,
        "lookup": row.lookup_json,
        "mapping": row.mapping_json,
        "status": row.status,
        "version": row.version,
        "created_at": row.created_at,
        "activated_at": row.activated_at,
    }


def _connector_or_404(db: Session, connector_id: int) -> Connector:
    row = db.get(Connector, connector_id)

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="connector not found",
        )

    return row


def _build_from_row(row: Connector):
    return build_connector(
        connector_id=row.id,
        system_code=row.system_code,
        name=row.name,
        kind=row.kind,
        entity=row.entity,
        config=row.config_json,
        lookup=row.lookup_json,
        mapping=row.mapping_json,
    )


def _csv_rows(
    connector: Connector,
) -> list[dict[str, str]]:
    runtime = _build_from_row(connector)

    if not isinstance(runtime, CsvConnector):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Studio sampling currently supports CSV connectors",
        )

    try:
        return runtime._read_rows()
    except ConnectorError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc


def _format_sample_dob(
    connector: Connector,
    dob: str,
) -> str:
    dob_format = connector.lookup_json.get("dob_format")

    if not isinstance(dob_format, str) or not dob_format:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lookup.dob_format is required",
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="identity_sample.dob must be ISO date or match lookup.dob_format",
        ) from exc


def _select_csv_sample(
    connector: Connector,
    identity_sample: IdentitySample | None,
) -> dict[str, str]:
    rows = _csv_rows(connector)

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="CSV contains no data rows",
        )

    if identity_sample is None:
        return rows[0]

    mobile_field = connector.lookup_json.get("mobile_field")
    dob_field = connector.lookup_json.get("dob_field")

    if not isinstance(mobile_field, str) or not mobile_field:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lookup.mobile_field is required",
        )

    if not isinstance(dob_field, str) or not dob_field:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lookup.dob_field is required",
        )

    formatted_dob = _format_sample_dob(
        connector,
        identity_sample.dob,
    )

    matches = [
        row
        for row in rows
        if row.get(mobile_field, "").strip() == identity_sample.mobile.strip()
        and row.get(dob_field, "").strip() == formatted_dob
    ]

    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="sample identity not found",
        )

    if len(matches) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="sample identity matched multiple records",
        )

    return matches[0]


def _infer_type(value: Any) -> str:
    if value is None:
        return "null"

    text = str(value).strip()

    if not text:
        return "string"

    if re.fullmatch(r"-?\d+", text):
        return "integer"

    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            datetime.strptime(text, fmt)
            return "date"
        except ValueError:
            continue

    return "string"


def _normalise_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def _field_score(source: str, target: str) -> float:
    source_n = _normalise_name(source)
    target_n = _normalise_name(target)

    if source_n == target_n:
        return 1.0

    aliases = {
        "traineeid": {"traineeid", "trainee", "candidateid", "id"},
        "traineename": {"traineename", "name", "fullname", "full_name"},
        "dob": {"dob", "dateofbirth", "birthdate"},
        "coursecode": {"coursecode", "course"},
        "coursename": {"coursename"},
        "completionstatus": {
            "completionstatus",
            "completion",
            "status",
        },
        "certificateno": {
            "certificateno",
            "certno",
            "certificatenumber",
        },
        "certificatedate": {
            "certificatedate",
            "certdate",
        },
    }

    for alias in aliases.get(target_n, set()):
        if source_n == _normalise_name(alias):
            return 0.97

    if target_n in source_n or source_n in target_n:
        return 0.85

    return SequenceMatcher(None, source_n, target_n).ratio()


def _date_transform(sample: Any) -> dict[str, str]:
    value = "" if sample is None else str(sample).strip()

    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            datetime.strptime(value, fmt)
            return {"date": fmt}
        except ValueError:
            continue

    return {"date": "%Y-%m-%d"}


def _suggest_transform(
    field: dict[str, Any],
    sample: Any,
) -> Any:
    name = str(field["name"])
    field_type = str(field.get("type", "string"))

    if name == "completion_status":
        return {
            "enum": {
                "Y": "COMPLETED",
                "N": "IN_PROGRESS",
                "D": "DROPPED",
            }
        }

    if field_type == "date":
        return _date_transform(sample)

    return "strip"


def _suggest_mapping(
    connector: Connector,
    sample: dict[str, str],
) -> dict[str, Any]:
    mapping: dict[str, Any] = {}

    fields = _canonical_fields(connector.entity)

    for field in fields:
        target = str(field.get("name", ""))
        if not target:
            continue

        best_source: str | None = None
        best_score = 0.0

        for source in sample:
            score = _field_score(source, target)

            if score > best_score:
                best_score = score
                best_source = source

        if best_source is None or best_score < 0.55:
            continue

        mapping[target] = {
            "source": best_source,
            "transform": _suggest_transform(
                field,
                sample.get(best_source),
            ),
        }

    return mapping


def _parse_length_rules(rule_text: str) -> tuple[int | None, int | None]:
    text = rule_text.replace("–", "-")

    range_match = re.search(r"(\d+)\s*-\s*(\d+)", text)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))

    maximum_match = re.search(r"<=?\s*(\d+)", text)
    if maximum_match:
        return None, int(maximum_match.group(1))

    return None, None


def _enum_values(rule_text: str) -> set[str]:
    match = re.search(r"`([^`]+)`", rule_text)

    if not match:
        return set()

    return {
        item.strip()
        for item in match.group(1).split(",")
        if item.strip()
    }


def _validate_canonical_record(
    entity: str,
    record: dict[str, Any],
    validators: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    fields = _canonical_fields(entity)

    for field in fields:
        name = str(field["name"])
        field_type = str(field.get("type", "string"))
        required = bool(field.get("required", False))
        rules = str(field.get("rules", ""))
        value = record.get(name)

        if required:
            passed = value is not None and str(value).strip() != ""

            results.append(
                {
                    "field": name,
                    "rule": "required",
                    "passed": passed,
                    "message": (
                        "value is present"
                        if passed
                        else "required value is missing"
                    ),
                }
            )

            if not passed:
                continue

        if value is None or value == "":
            continue

        if field_type == "date":
            try:
                parsed = date.fromisoformat(str(value))
                passed = True

                if "not in the future" in rules:
                    passed = parsed <= date.today()

                results.append(
                    {
                        "field": name,
                        "rule": "date",
                        "passed": passed,
                        "message": (
                            "valid ISO date"
                            if passed
                            else "date must not be in the future"
                        ),
                    }
                )
            except ValueError:
                results.append(
                    {
                        "field": name,
                        "rule": "date",
                        "passed": False,
                        "message": "expected ISO date",
                    }
                )

        elif field_type == "enum":
            allowed = _enum_values(rules)
            passed = not allowed or str(value) in allowed

            results.append(
                {
                    "field": name,
                    "rule": "enum",
                    "passed": passed,
                    "message": (
                        "value is allowed"
                        if passed
                        else f"value must be one of {sorted(allowed)}"
                    ),
                }
            )

        elif field_type == "string":
            passed = isinstance(value, str)

            results.append(
                {
                    "field": name,
                    "rule": "string",
                    "passed": passed,
                    "message": (
                        "value is a string"
                        if passed
                        else "value must be a string"
                    ),
                }
            )

            if passed:
                minimum, maximum = _parse_length_rules(rules)

                if minimum is not None:
                    results.append(
                        {
                            "field": name,
                            "rule": f"min_length:{minimum}",
                            "passed": len(value) >= minimum,
                            "message": (
                                "minimum length satisfied"
                                if len(value) >= minimum
                                else f"minimum length is {minimum}"
                            ),
                        }
                    )

                if maximum is not None:
                    results.append(
                        {
                            "field": name,
                            "rule": f"max_length:{maximum}",
                            "passed": len(value) <= maximum,
                            "message": (
                                "maximum length satisfied"
                                if len(value) <= maximum
                                else f"maximum length is {maximum}"
                            ),
                        }
                    )

    for validator in validators:
        field = validator.get("field")
        rule = validator.get("rule")

        if not isinstance(field, str) or not isinstance(rule, str):
            continue

        value = record.get(field)

        if rule == "required":
            passed = value is not None and str(value).strip() != ""
            message = (
                "required value is present"
                if passed
                else "required value is missing"
            )
        elif rule == "date":
            try:
                date.fromisoformat(str(value))
                passed = True
                message = "valid ISO date"
            except (TypeError, ValueError):
                passed = False
                message = "expected ISO date"
        else:
            passed = True
            message = "validator accepted"

        results.append(
            {
                "field": field,
                "rule": rule,
                "passed": passed,
                "message": message,
            }
        )

    return results


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_connector(
    body: ConnectorCreateRequest,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    system_code = body.system_code.upper()
    kind = body.kind.upper()

    if kind not in SUPPORTED_KINDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unsupported connector kind",
        )

    system = db.get(System, system_code)

    if system is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="system not found",
        )

    existing = db.scalar(
        select(Connector).where(Connector.name == body.name)
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="connector name already exists",
        )

    _canonical_fields(body.entity)

    config = dict(body.config)

    if body.auth:
        config["auth"] = dict(body.auth)

    row = Connector(
        system_code=system_code,
        name=body.name.strip(),
        kind=kind,
        entity=body.entity.strip(),
        config_json=config,
        lookup_json=dict(body.lookup),
        mapping_json={},
        status="DRAFT",
        version=1,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        **_serialize_connector(row),
        "status": "DRAFT",
    }


@router.post("/{connector_id}/sample")
def sample_connector(
    connector_id: int,
    body: ConnectorSampleRequest,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    connector = _connector_or_404(db, connector_id)

    if connector.status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="active connector cannot be sampled in onboarding mode",
        )

    started = time.perf_counter()
    raw = _select_csv_sample(
        connector,
        body.identity_sample,
    )

    fields = [
        {
            "path": key,
            "sample": value,
            "inferred_type": _infer_type(value),
        }
        for key, value in raw.items()
    ]

    duration_ms = round(
        (time.perf_counter() - started) * 1000,
        3,
    )

    return {
        "raw": raw,
        "fields": fields,
        "duration_ms": duration_ms,
    }


@router.post("/{connector_id}/suggest-mapping")
def suggest_mapping(
    connector_id: int,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    connector = _connector_or_404(db, connector_id)

    if connector.status == "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="active connector cannot be reconfigured",
        )

    sample = _select_csv_sample(
        connector,
        None,
    )

    return {
        "mapping": _suggest_mapping(
            connector,
            sample,
        )
    }


@router.put("/{connector_id}/mapping")
def save_mapping(
    connector_id: int,
    body: ConnectorMappingRequest,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    connector = _connector_or_404(db, connector_id)

    if connector.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="mapping can only be changed while connector is DRAFT",
        )

    _canonical_fields(connector.entity)

    connector.mapping_json = deepcopy(body.mapping)
    connector.config_json = dict(connector.config_json)

    if body.validators:
        connector.config_json["validators"] = deepcopy(
            body.validators
        )
    else:
        connector.config_json["validators"] = []

    db.commit()
    db.refresh(connector)

    return _serialize_connector(connector)


@router.post("/{connector_id}/test")
def test_connector(
    connector_id: int,
    body: ConnectorTestRequest,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    connector = _connector_or_404(db, connector_id)

    if connector.status not in {"DRAFT", "TESTED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="connector cannot be tested in its current state",
        )

    mapping = (
        deepcopy(body.mapping)
        if body.mapping is not None
        else deepcopy(connector.mapping_json)
    )

    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="mapping is required",
        )

    started = time.perf_counter()

    test_config = dict(connector.config_json)

    test_row = Connector(
        system_code=connector.system_code,
        name=connector.name,
        kind=connector.kind,
        entity=connector.entity,
        config_json=test_config,
        lookup_json=dict(connector.lookup_json),
        mapping_json=mapping,
        status=connector.status,
        version=connector.version,
        created_at=connector.created_at,
    )

    try:
        runtime = build_connector(
            connector_id=connector.id,
            system_code=test_row.system_code,
            name=test_row.name,
            kind=test_row.kind,
            entity=test_row.entity,
            config=test_row.config_json,
            lookup=test_row.lookup_json,
            mapping=mapping,
        )

        result = runtime.fetch(
            mobile=body.identity_sample.mobile,
            dob=body.identity_sample.dob,
            correlation_id=f"studio-test-{connector.id}",
        )

        canonical = result.get("record")

        if not isinstance(canonical, dict):
            raise ConnectorResponseError(
                "connector test returned invalid canonical record"
            )

        validators = connector.config_json.get("validators", [])

        if not isinstance(validators, list):
            raise ConnectorConfigurationError(
                "connector validators must be a list"
            )

        validation = _validate_canonical_record(
            connector.entity,
            canonical,
            validators,
        )

    except MappingError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ConnectorResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except ConnectorTransportError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except ConnectorConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    duration_ms = round(
        (time.perf_counter() - started) * 1000,
        3,
    )

    passed = all(item["passed"] for item in validation)

    if passed:
        connector.status = "TESTED"
        db.commit()

    return {
        "canonical": canonical,
        "validation": validation,
        "duration_ms": duration_ms,
    }


@router.post("/{connector_id}/activate")
def activate_connector(
    connector_id: int,
    body: ConnectorActivateRequest,
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    connector = _connector_or_404(db, connector_id)

    if connector.status != "TESTED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="connector must be TESTED before activation",
        )

    journey = db.scalar(
        select(JourneyDef)
        .where(
            JourneyDef.id == body.journey_id,
            JourneyDef.status == "ACTIVE",
        )
        .order_by(JourneyDef.version.desc())
    )

    if journey is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="active journey not found",
        )

    definition = deepcopy(journey.definition_json)

    if not isinstance(definition, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="journey definition is invalid",
        )

    steps = definition.get("steps")

    if not isinstance(steps, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="journey definition has no steps",
        )

    target_step = None

    for step in steps:
        if isinstance(step, dict) and step.get("id") == body.step_id:
            target_step = step
            break

    if target_step is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="journey step not found",
        )

    if target_step.get("connector") != connector.name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="connector name does not match journey step reference",
        )

    if target_step.get("entity") != connector.entity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="connector entity does not match journey step",
        )

    activated_at = datetime.now(timezone.utc)
    connector.status = "ACTIVE"
    connector.activated_at = activated_at

    target_step["configured"] = True
    journey.definition_json = definition

    db.commit()
    db.refresh(connector)

    created_at = connector.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    onboarding_seconds = max(
        0.0,
        (activated_at - created_at).total_seconds(),
    )

    return {
        "connector": _serialize_connector(connector),
        "onboarding_seconds": round(onboarding_seconds, 3),
        "journey_version": journey.version,
    }
