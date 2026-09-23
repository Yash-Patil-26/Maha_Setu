from datetime import date

import pytest

from app.mapping.engine import (
    MappingRule,
    apply_mapping,
)


def test_apply_mapping_transforms_fields() -> None:
    rules = [
        MappingRule(
            source_field="name",
            canonical_field="full_name",
            transform="title_case",
        ),
        MappingRule(
            source_field="income",
            canonical_field="annual_income_inr",
            transform="to_int",
        ),
        MappingRule(
            source_field="dob",
            canonical_field="dob",
            transform="date",
        ),
    ]

    result = apply_mapping(
        rules,
        {
            "name": "  rahul patil ",
            "income": "2,10,000",
            "dob": "2001-05-14",
        },
    )

    assert result == {
        "full_name": "Rahul Patil",
        "annual_income_inr": 210000,
        "dob": date(2001, 5, 14),
    }


def test_enum_mapping_normalizes_value() -> None:
    rule = MappingRule(
        source_field="category",
        canonical_field="category_code",
        transform="enum",
        options={
            "mapping": {
                "SC": "SC",
                "ST": "ST",
                "OBC": "OBC",
                "VJNT": "VJNT",
                "SBC": "SBC",
                "OPEN": "OPEN",
            }
        },
    )

    result = apply_mapping([rule], {"category": " obc "})

    assert result == {"category_code": "OBC"}


def test_missing_source_field_becomes_none() -> None:
    rule = MappingRule(
        source_field="income",
        canonical_field="annual_income_inr",
        transform="to_int",
    )

    result = apply_mapping([rule], {"name": "Rahul"})

    assert result == {"annual_income_inr": None}


def test_invalid_enum_fails() -> None:
    rule = MappingRule(
        source_field="category",
        canonical_field="category_code",
        transform="enum",
        options={
            "mapping": {
                "SC": "SC",
                "ST": "ST",
                "OBC": "OBC",
            }
        },
    )

    with pytest.raises(ValueError):
        apply_mapping([rule], {"category": "UNKNOWN"})
from datetime import date

import pytest

from app.mapping.engine import MappingRule, apply_mapping


def test_date_with_source_format() -> None:
    rule = MappingRule(
        source_field="issue_date",
        canonical_field="issue_date",
        transform="date",
        options={"format": "%d/%m/%Y"},
    )

    assert apply_mapping([rule], {"issue_date": "15/04/2026"}) == {
        "issue_date": date(2026, 4, 15)
    }


def test_enum_maps_source_code_to_canonical_value() -> None:
    rule = MappingRule(
        source_field="status",
        canonical_field="status",
        transform="enum",
        options={"mapping": {"A": "ACTIVE", "T": "TERMINATED", "D": "DROPPED"}},
    )

    assert apply_mapping([rule], {"status": " a "}) == {"status": "ACTIVE"}


def test_fractional_integer_fails() -> None:
    rule = MappingRule(
        source_field="income",
        canonical_field="annual_income_inr",
        transform="to_int",
    )

    with pytest.raises(ValueError):
        apply_mapping([rule], {"income": "210000.50"})


def test_blank_date_becomes_none() -> None:
    rule = MappingRule(
        source_field="valid_until",
        canonical_field="valid_until",
        transform="date",
        options={"format": "%d/%m/%Y"},
    )

    assert apply_mapping([rule], {"valid_until": ""}) == {"valid_until": None}
