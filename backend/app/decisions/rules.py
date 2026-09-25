from __future__ import annotations

import json
from pathlib import Path
from typing import Any

RULES_PATH = Path(__file__).with_name("rules.json")


class DecisionError(ValueError):
    """Raised when a configured decision rule cannot be evaluated."""


def load_rules() -> dict[str, Any]:
    try:
        payload = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DecisionError("Unable to load decision rules") from exc

    if not isinstance(payload, dict):
        raise DecisionError("Decision rules must be a JSON object")

    return payload


def _get_path(payload: dict[str, Any], path: str) -> Any:
    current: Any = payload

    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            raise DecisionError(f"Missing decision input: {path}")
        current = current[part]

    return current


def evaluate_rule(
    rule_name: str,
    canonical: dict[str, Any],
) -> dict[str, Any]:
    rules = load_rules()
    rule = rules.get(rule_name)

    if not isinstance(rule, dict):
        raise DecisionError(f"Unknown decision rule: {rule_name}")

    conditions = rule.get("conditions")

    if not isinstance(conditions, list) or not conditions:
        raise DecisionError(
            f"Decision rule has no conditions: {rule_name}"
        )

    reasons: list[dict[str, Any]] = []

    for condition in conditions:
        if not isinstance(condition, dict):
            raise DecisionError(
                f"Invalid condition in rule: {rule_name}"
            )

        code = condition.get("code")
        path = condition.get("path")
        operator = condition.get("operator")

        if not all(
            isinstance(value, str) and value
            for value in (code, path, operator)
        ):
            raise DecisionError(
                f"Invalid condition metadata in rule: {rule_name}"
            )

        actual = _get_path(canonical, path)

        if operator == "lte":
            threshold = condition.get("threshold")

            if (
                not isinstance(threshold, (int, float))
                or isinstance(threshold, bool)
            ):
                raise DecisionError(
                    f"Invalid threshold in rule: {rule_name}"
                )

            passed = actual <= threshold
            message = condition.get("message", "")
            rendered = message.format(
                value=actual,
                threshold=threshold,
            )

        elif operator == "eq":
            expected = condition.get("value")
            passed = actual == expected
            message = condition.get("message", "")
            rendered = message.format(
                value=actual,
                expected=expected,
            )

        else:
            raise DecisionError(
                f"Unsupported decision operator "
                f"{operator!r} in rule {rule_name!r}"
            )

        reasons.append(
            {
                "code": code,
                "message": rendered,
                "passed": passed,
                "path": path,
                "actual": actual,
            }
        )

    return {
        "rule": rule_name,
        "eligible": all(
            reason["passed"] for reason in reasons
        ),
        "reasons": reasons,
    }
