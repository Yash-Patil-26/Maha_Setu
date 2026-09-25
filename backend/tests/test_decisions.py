from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.decisions.rules import evaluate_rule  # noqa: E402


def test_income_rule_passes() -> None:
    result = evaluate_rule(
        "post_matric_income_250000",
        {
            "income_certificate": {
                "annual_income_inr": 210000,
            }
        },
    )

    assert result["eligible"] is True
    assert result["reasons"][0]["code"] == "INCOME_LIMIT"
    assert result["reasons"][0]["passed"] is True


def test_income_rule_fails() -> None:
    result = evaluate_rule(
        "post_matric_income_250000",
        {
            "income_certificate": {
                "annual_income_inr": 250001,
            }
        },
    )

    assert result["eligible"] is False
    assert result["reasons"][0]["code"] == "INCOME_LIMIT"
    assert result["reasons"][0]["passed"] is False
    assert "250,001" in result["reasons"][0]["message"]
    assert "250,000" in result["reasons"][0]["message"]
