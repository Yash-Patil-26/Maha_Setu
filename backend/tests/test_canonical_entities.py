"""T-003 parity test for the canonical entity registry.

The canonical Markdown contract is the source of truth. This test parses the
entity tables from docs/canonical.md and compares them exactly with
backend/app/canonical/entities.json.

No hard-coded field list is used here, so the test detects added, renamed,
dropped, type-changed, requiredness-changed, or rule-changed fields.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_PATH = REPO_ROOT / "docs" / "canonical.md"
ENTITIES_PATH = REPO_ROOT / "backend" / "app" / "canonical" / "entities.json"


def parse_canonical_entities(markdown: str) -> dict:
    lines = markdown.splitlines()
    entities: dict[str, list[dict]] = {}
    current_entity: str | None = None

    for index, line in enumerate(lines):
        match = re.match(r"^### \d+\.\d+ `([^`]+)`", line)
        if match:
            current_entity = match.group(1)
            entities[current_entity] = []
            continue

        if current_entity and line.startswith("| Field | Type | Req | Rules |"):
            row_index = index + 2

            while row_index < len(lines) and lines[row_index].startswith("|"):
                parts = [
                    part.strip()
                    for part in lines[row_index].strip().strip("|").split("|")
                ]

                if len(parts) == 4 and parts[0] != "---":
                    entities[current_entity].append(
                        {
                            "name": parts[0],
                            "type": parts[1],
                            "required": parts[2].lower() == "yes",
                            "rules": parts[3],
                        }
                    )

                row_index += 1

    return {
        "entities": {
            entity_name: {"fields": fields}
            for entity_name, fields in entities.items()
        }
    }


def test_entities_json_matches_canonical_contract() -> None:
    canonical = parse_canonical_entities(
        CANONICAL_PATH.read_text(encoding="utf-8")
    )
    actual = json.loads(ENTITIES_PATH.read_text(encoding="utf-8"))

    assert actual == canonical, (
        "backend/app/canonical/entities.json does not exactly match "
        "the entity tables in docs/canonical.md"
    )
