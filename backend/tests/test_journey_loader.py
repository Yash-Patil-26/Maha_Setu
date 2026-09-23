from pathlib import Path

import pytest

from app.journeys import (
    JourneyDefinitionError,
    load_journey_definition,
    validate_journey_definition,
)

JOURNEYS_DIR = (
    Path(__file__).resolve().parents[1]
    / "app"
    / "journeys"
)


def test_loads_valid_scholarship_definition():
    definition = load_journey_definition(
        JOURNEYS_DIR / "scholarship_v1.json"
    )

    assert (
        definition["consent_purpose"]
        == "scholarship_eligibility"
    )

    assert [
        step["id"]
        for step in definition["steps"]
    ] == [
        "fetch_income",
        "fetch_enrolment",
        "evaluate_eligibility",
        "submit_bss",
    ]


def test_loads_valid_youth_enterprise_definition():
    definition = load_journey_definition(
        JOURNEYS_DIR / "youth_enterprise_v1.json"
    )

    assert (
        definition["consent_purpose"]
        == "youth_enterprise_eligibility"
    )

    assert (
        definition["steps"][0]["connector"]
        == "skl_training"
    )


def test_rejects_invalid_step_type():
    with pytest.raises(
        JourneyDefinitionError,
        match="type",
    ):
        validate_journey_definition(
            {
                "consent_purpose": "test",
                "steps": [
                    {
                        "id": "broken",
                        "type": "unknown",
                    }
                ],
            }
        )


def test_rejects_fetch_step_without_connector():
    with pytest.raises(
        JourneyDefinitionError,
        match="fetch step requires 'connector'",
    ):
        validate_journey_definition(
            {
                "consent_purpose": "test",
                "steps": [
                    {
                        "id": "fetch_record",
                        "type": "fetch",
                        "entity": "training_record",
                    }
                ],
            }
        )


def test_rejects_duplicate_step_ids():
    with pytest.raises(
        JourneyDefinitionError,
        match="steps must have unique 'id' values",
    ):
        validate_journey_definition(
            {
                "consent_purpose": "test",
                "steps": [
                    {
                        "id": "same",
                        "type": "decision",
                        "rule": "rule_a",
                    },
                    {
                        "id": "same",
                        "type": "decision",
                        "rule": "rule_b",
                    },
                ],
            }
        )


def test_rejects_malformed_json(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text(
        "{not valid json",
        encoding="utf-8",
    )

    with pytest.raises(
        JourneyDefinitionError,
        match="Invalid JSON",
    ):
        load_journey_definition(path)


def test_rejects_non_object_definition():
    with pytest.raises(
        JourneyDefinitionError,
        match="root must be an object",
    ):
        validate_journey_definition([])
