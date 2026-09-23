from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    ValidationError,
    field_validator,
    model_validator,
)

JourneyStepType = Literal["fetch", "decision", "submit", "wait_event"]


class JourneyDefinitionError(ValueError):
    """Raised when a journey definition cannot be loaded or validated."""


class JourneyStep(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1)
    type: JourneyStepType
    connector: str | None = None
    entity: str | None = None
    rule: str | None = None
    configured: StrictBool = False

    @field_validator("id", "connector", "entity", "rule")
    @classmethod
    def reject_blank_strings(
        cls,
        value: str | None,
    ) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("must not be blank")
        return value

    @model_validator(mode="after")
    def validate_step_requirements(self) -> "JourneyStep":
        if self.type == "fetch":
            if not self.connector:
                raise ValueError("fetch step requires 'connector'")
            if not self.entity:
                raise ValueError("fetch step requires 'entity'")

        elif self.type == "decision":
            if not self.rule:
                raise ValueError("decision step requires 'rule'")

        elif self.type == "submit":
            if not self.connector:
                raise ValueError("submit step requires 'connector'")

        return self


class JourneyDefinition(BaseModel):
    model_config = ConfigDict(extra="allow")

    consent_purpose: str = Field(min_length=1)
    steps: list[JourneyStep] = Field(min_length=1)

    @field_validator("consent_purpose")
    @classmethod
    def reject_blank_consent_purpose(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value

    @model_validator(mode="after")
    def validate_unique_step_ids(self) -> "JourneyDefinition":
        step_ids = [step.id for step in self.steps]

        if len(step_ids) != len(set(step_ids)):
            raise ValueError(
                "steps must have unique 'id' values"
            )

        return self


def _format_validation_error(exc: ValidationError) -> str:
    details: list[str] = []

    for error in exc.errors():
        location = " -> ".join(str(item) for item in error["loc"])
        details.append(f"{location}: {error['msg']}")

    return "; ".join(details)


def validate_journey_definition(
    definition: Any,
    *,
    source: str = "<memory>",
) -> dict[str, Any]:
    """Validate a journey definition and return its normalized dictionary."""
    if not isinstance(definition, dict):
        raise JourneyDefinitionError(
            f"Invalid journey definition in {source}: "
            "root must be an object"
        )

    try:
        validated = JourneyDefinition.model_validate(definition)
    except ValidationError as exc:
        raise JourneyDefinitionError(
            f"Invalid journey definition in {source}: "
            f"{_format_validation_error(exc)}"
        ) from exc

    return validated.model_dump(
        mode="json",
        exclude_none=True,
    )


def load_journey_definition(
    path: str | Path,
) -> dict[str, Any]:
    """Load, parse, and validate a JSON journey definition."""
    definition_path = Path(path)

    try:
        raw_text = definition_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise JourneyDefinitionError(
            f"Could not read journey definition "
            f"{definition_path}: {exc}"
        ) from exc

    try:
        definition = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise JourneyDefinitionError(
            f"Invalid JSON in journey definition "
            f"{definition_path}: {exc.msg} "
            f"at line {exc.lineno}, column {exc.colno}"
        ) from exc

    return validate_journey_definition(
        definition,
        source=str(definition_path),
    )
