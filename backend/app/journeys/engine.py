from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..connectors.errors import (
    ConnectorConfigurationError,
    ConnectorError,
    ConnectorResponseError,
    ConnectorTransportError,
    MappingError,
)
from ..connectors.repository import get_connector
from ..decisions.rules import DecisionError, evaluate_rule
from ..models import Application, ApplicationStep, JourneyDef, User
from ..services.consent import (
    ConsentError,
    ConsentRequiredError,
    ConsentRevokedError,
    filter_consented_fields,
    get_active_consent,
    record_access,
)
from .loader import JourneyDefinition, JourneyDefinitionError

MAX_ATTEMPTS = 2


class JourneyExecutionError(RuntimeError):
    """Raised when a persisted journey cannot continue."""


ConnectorLoader = Callable[[Session, str], Any]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _error_code(exc: Exception) -> str:
    if isinstance(exc, MappingError):
        return "MAPPING_ERROR"

    if isinstance(exc, ConnectorTransportError):
        return "CONNECTOR_ERROR"

    if isinstance(exc, ConnectorResponseError):
        if "record not found" in str(exc).lower():
            return "IDENTITY_NOT_FOUND"
        return "CONNECTOR_ERROR"

    if isinstance(exc, ConnectorConfigurationError):
        return "CONNECTOR_ERROR"

    if isinstance(exc, ConsentRevokedError):
        return "CONSENT_REVOKED"

    if isinstance(exc, ConsentRequiredError):
        return "CONSENT_REQUIRED"

    if isinstance(exc, DecisionError):
        return "DECISION_ERROR"

    if isinstance(exc, ConnectorError):
        return "CONNECTOR_ERROR"

    if isinstance(exc, JourneyDefinitionError):
        return "JOURNEY_CONFIGURATION_ERROR"

    return "JOURNEY_ERROR"


def _load_journey(
    db: Session,
    application: Application,
) -> JourneyDefinition:
    row = db.scalar(
        select(JourneyDef).where(
            JourneyDef.id == application.journey_id,
            JourneyDef.version == application.journey_version,
            JourneyDef.status == "ACTIVE",
        )
    )

    if row is None:
        raise JourneyExecutionError(
            "Active journey not found: "
            f"{application.journey_id} "
            f"v{application.journey_version}"
        )

    try:
        return JourneyDefinition.model_validate(
            row.definition_json
        )
    except Exception as exc:
        raise JourneyExecutionError(
            "Stored journey definition is invalid"
        ) from exc


def _ensure_steps(
    db: Session,
    application: Application,
    definition: JourneyDefinition,
) -> dict[str, ApplicationStep]:
    existing = {
        step.step_id: step
        for step in db.scalars(
            select(ApplicationStep)
            .where(
                ApplicationStep.application_id == application.id
            )
            .order_by(ApplicationStep.id)
        )
    }

    for definition_step in definition.steps:
        if definition_step.id not in existing:
            row = ApplicationStep(
                application_id=application.id,
                step_id=definition_step.id,
                status="PENDING",
            )
            db.add(row)
            existing[definition_step.id] = row

    db.flush()
    return existing


def _mark_remaining_skipped(
    steps: list[Any],
    current_index: int,
    step_rows: dict[str, ApplicationStep],
) -> None:
    ended_at = _utc_now()

    for definition_step in steps[current_index + 1 :]:
        row = step_rows[definition_step.id]

        if row.status == "PENDING":
            row.status = "SKIPPED"
            row.ended_at = ended_at


def _merge_fetch_result(
    application: Application,
    result: dict[str, Any],
) -> None:
    entity = result.get("entity")
    record = result.get("record")
    source_system = result.get("source_system")

    if not isinstance(entity, str) or not entity:
        raise JourneyExecutionError(
            "Connector fetch result is missing entity"
        )

    if not isinstance(record, dict):
        raise JourneyExecutionError(
            "Connector fetch result has invalid record"
        )

    if not isinstance(source_system, str) or not source_system:
        raise JourneyExecutionError(
            "Connector fetch result is missing source_system"
        )

    canonical = dict(application.canonical_json)
    canonical[entity] = record
    application.canonical_json = canonical

    metrics = dict(application.metrics_json)
    provenance = dict(metrics.get("provenance", {}))

    fetched_at = result.get("fetched_at")

    for field, value in record.items():
        provenance[f"{entity}.{field}"] = {
            "value": value,
            "source_system": source_system,
            "fetched_at": fetched_at,
        }

    metrics["provenance"] = provenance
    metrics["fields_total"] = sum(
        len(value)
        for value in canonical.values()
        if isinstance(value, dict)
    )
    metrics["fields_autofilled"] = metrics["fields_total"]
    metrics["systems_queried"] = len(
        [
            value
            for value in canonical.values()
            if isinstance(value, dict)
        ]
    )

    application.metrics_json = metrics

    external_id = result.get("external_id")

    if external_id:
        external_refs = dict(application.external_refs_json)
        external_refs[source_system] = external_id
        application.external_refs_json = external_refs


def _execute_step(
    db: Session,
    application: Application,
    user: User,
    definition_step: Any,
    step_row: ApplicationStep,
    connector_loader: ConnectorLoader,
) -> bool:
    step_row.status = "RUNNING"
    step_row.attempts += 1
    step_row.started_at = _utc_now()
    step_row.ended_at = None
    step_row.error_code = None
    step_row.error_detail = None

    db.flush()

    try:
        if definition_step.configured is False:
            raise ConnectorConfigurationError(
                "Journey step is not configured: "
                f"{definition_step.id}"
            )

        if definition_step.type == "fetch":
            connector = connector_loader(
                db,
                definition_step.connector,
            )

            purpose = None
            journey_row = db.scalar(
                select(JourneyDef).where(
                    JourneyDef.id == application.journey_id,
                    JourneyDef.version == application.journey_version,
                )
            )

            if journey_row is not None:
                purpose = (journey_row.definition_json or {}).get(
                    "consent_purpose"
                )

            if not isinstance(purpose, str) or not purpose:
                raise JourneyExecutionError(
                    "Journey is missing consent_purpose"
                )

            consent = get_active_consent(
                db=db,
                master_id=user.master_id,
                purpose=purpose,
                source_system=connector.system_code,
                journey_id=application.journey_id,
            )

            mobile = user.mobile
            dob = user.dob

            if not mobile or not dob:
                raise JourneyExecutionError(
                    "Citizen identity is incomplete"
                )

            result = connector.fetch(
                mobile=mobile,
                dob=dob,
                correlation_id=application.correlation_id,
            )

            if result.get("entity") != definition_step.entity:
                raise JourneyExecutionError(
                    "Connector entity mismatch for step "
                    f"{definition_step.id}"
                )

            raw_record = result.get("record")
            if not isinstance(raw_record, dict):
                raise JourneyExecutionError(
                    "Connector fetch result has invalid record"
                )

            filtered_record = filter_consented_fields(
                consent,
                raw_record,
            )

            result = dict(result)
            result["record"] = filtered_record

            record_access(
                db,
                master_id=user.master_id,
                system_code=connector.system_code,
                purpose=purpose,
                fields=sorted(filtered_record),
                outcome="ALLOWED",
                application_id=application.id,
            )

            _merge_fetch_result(
                application,
                result,
            )
            step_row.output_json = result

        elif definition_step.type == "decision":
            result = evaluate_rule(
                definition_step.rule,
                dict(application.canonical_json),
            )

            step_row.output_json = result
            application.outcome = (
                "ELIGIBLE"
                if result["eligible"]
                else "NOT_ELIGIBLE"
            )

            if not result["eligible"]:
                application.status = "NOT_ELIGIBLE"
                application.current_step = definition_step.id
                step_row.status = "DONE"
                step_row.ended_at = _utc_now()
                return False

        elif definition_step.type == "submit":
            connector = connector_loader(
                db,
                definition_step.connector,
            )

            scheme_code = connector.config.get(
                "scheme_code"
            )

            if not isinstance(scheme_code, str) or not scheme_code:
                raise ConnectorConfigurationError(
                    f"{connector.name}: "
                    "config.scheme_code is required for "
                    "submit steps"
                )

            applicant = {
                "master_id": user.master_id,
                "full_name": (
                    user.full_name or user.display_name
                ),
                "dob": user.dob,
                "mobile": user.mobile,
            }

            result = connector.submit(
                applicant=applicant,
                scheme_code=scheme_code,
                data=dict(application.canonical_json),
                application_id=application.id,
                step_id=definition_step.id,
                correlation_id=application.correlation_id,
            )

            step_row.output_json = result

            external_id = result.get("external_id")

            if external_id:
                external_refs = dict(
                    application.external_refs_json
                )
                external_refs["BSS"] = external_id
                application.external_refs_json = external_refs

            application.status = "SUBMITTED"
            application.outcome = "ELIGIBLE"
            application.current_step = "await_decision"

        elif definition_step.type == "wait_event":
            step_row.status = "WAITING"
            application.status = "IN_PROGRESS"
            application.current_step = definition_step.id
            db.commit()
            return False

        else:
            raise JourneyExecutionError(
                "Unsupported journey step type: "
                f"{definition_step.type}"
            )

        step_row.status = "DONE"
        step_row.ended_at = _utc_now()
        return True

    except (
        ConnectorError,
        ConsentError,
        DecisionError,
        JourneyExecutionError,
        JourneyDefinitionError,
    ) as exc:
        step_row.status = "FAILED"
        step_row.ended_at = _utc_now()
        step_row.error_code = _error_code(exc)
        step_row.error_detail = str(exc)

        application.status = "PAUSED_EXCEPTION"
        application.current_step = definition_step.id

        if isinstance(exc, ConsentError):
            journey_row = db.scalar(
                select(JourneyDef).where(
                    JourneyDef.id == application.journey_id,
                    JourneyDef.version == application.journey_version,
                )
            )
            purpose = (
                (journey_row.definition_json or {}).get("consent_purpose")
                if journey_row is not None
                else None
            )

            if isinstance(purpose, str) and purpose:
                connector = connector_loader(
                    db,
                    definition_step.connector,
                )
                record_access(
                    db,
                    master_id=user.master_id,
                    system_code=connector.system_code,
                    purpose=purpose,
                    fields=sorted(
                        str(field)
                        for field in (connector.mapping or {})
                    ),
                    outcome="DENIED",
                    application_id=application.id,
                )

        db.commit()
        return False


def execute_application(
    db: Session,
    application_id: int,
    *,
    connector_loader: ConnectorLoader = get_connector,
) -> Application:
    application = db.get(
        Application,
        application_id,
    )

    if application is None:
        raise JourneyExecutionError(
            f"Application not found: {application_id}"
        )

    if application.status in {
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "NOT_ELIGIBLE",
    }:
        raise JourneyExecutionError(
            "Application is already in terminal state: "
            f"{application.status}"
        )

    user = db.scalar(
        select(User).where(
            User.master_id == application.master_id
        )
    )

    if user is None:
        raise JourneyExecutionError(
            "Citizen not found for master_id: "
            f"{application.master_id}"
        )

    definition = _load_journey(
        db,
        application,
    )

    step_rows = _ensure_steps(
        db,
        application,
        definition,
    )

    application.status = "IN_PROGRESS"
    definition_steps = definition.steps

    start_index = 0

    if application.current_step:
        for index, definition_step in enumerate(
            definition_steps
        ):
            if definition_step.id == application.current_step:
                start_index = index
                break

    for index, definition_step in enumerate(
        definition_steps[start_index:],
        start=start_index,
    ):
        step_row = step_rows[definition_step.id]

        if step_row.status in {
            "DONE",
            "SKIPPED",
        }:
            continue

        if step_row.attempts >= MAX_ATTEMPTS:
            application.status = "PAUSED_EXCEPTION"
            application.current_step = definition_step.id
            db.commit()
            break

        application.current_step = definition_step.id
        db.commit()

        continued = _execute_step(
            db,
            application,
            user,
            definition_step,
            step_row,
            connector_loader,
        )

        db.commit()

        if application.status == "NOT_ELIGIBLE":
            _mark_remaining_skipped(
                definition_steps,
                index,
                step_rows,
            )
            db.commit()
            break

        if not continued:
            break

        if application.status == "SUBMITTED":
            break

    return application


def retry_application(
    db: Session,
    application_id: int,
    *,
    connector_loader: ConnectorLoader = get_connector,
) -> Application:
    application = db.get(
        Application,
        application_id,
    )

    if application is None:
        raise JourneyExecutionError(
            f"Application not found: {application_id}"
        )

    if application.status != "PAUSED_EXCEPTION":
        raise JourneyExecutionError(
            "Retry is allowed only for PAUSED_EXCEPTION, "
            f"got {application.status}"
        )

    if not application.current_step:
        raise JourneyExecutionError(
            "Paused application has no current step"
        )

    definition = _load_journey(
        db,
        application,
    )

    step_rows = _ensure_steps(
        db,
        application,
        definition,
    )

    failed = step_rows.get(
        application.current_step
    )

    if failed is None:
        raise JourneyExecutionError(
            "Current step not found: "
            f"{application.current_step}"
        )

    if failed.status != "FAILED":
        raise JourneyExecutionError(
            "Current step is not failed: "
            f"{application.current_step}"
        )

    if failed.attempts >= MAX_ATTEMPTS:
        raise JourneyExecutionError(
            "Manual retry already used for this step"
        )

    application.status = "IN_PROGRESS"
    db.commit()

    return execute_application(
        db,
        application_id,
        connector_loader=connector_loader,
    )
