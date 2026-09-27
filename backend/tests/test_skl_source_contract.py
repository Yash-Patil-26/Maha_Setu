from __future__ import annotations

import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.connectors.mapping import apply_mapping

ROOT = Path(__file__).resolve().parents[2]
SKL_PATH = ROOT / "data_drop" / "skills_registry.csv"

EXPECTED_HEADERS = [
    "TRAINEE_ID",
    "TRAINEE_NAME",
    "DOB",
    "MOBILE",
    "COURSE_CODE",
    "COURSE_NAME",
    "COMPLETION",
    "CERT_NO",
    "CERT_DATE",
]

SKL_MAPPING = {
    "trainee_id": {
        "source": "TRAINEE_ID",
        "transform": "strip",
    },
    "trainee_name": {
        "source": "TRAINEE_NAME",
        "transform": "title_case",
    },
    "dob": {
        "source": "DOB",
        "transform": {"date": "%d-%m-%Y"},
    },
    "course_code": {
        "source": "COURSE_CODE",
        "transform": "strip",
    },
    "course_name": {
        "source": "COURSE_NAME",
        "transform": "strip",
    },
    "completion_status": {
        "source": "COMPLETION",
        "transform": {
            "enum": {
                "Y": "COMPLETED",
                "N": "IN_PROGRESS",
                "D": "DROPPED",
            }
        },
    },
    "certificate_no": {
        "source": "CERT_NO",
        "transform": "strip",
    },
    "certificate_date": {
        "source": "CERT_DATE",
        "transform": {"date": "%d-%m-%Y"},
    },
}


def _read_rows() -> list[dict[str, str]]:
    with SKL_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as handle:
        return list(csv.DictReader(handle))


def test_skl_source_contract() -> None:
    assert SKL_PATH.is_file()

    with SKL_PATH.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == EXPECTED_HEADERS

        rows = list(reader)

    assert len(rows) >= 1

    suresh = next(
        (
            row
            for row in rows
            if row["MOBILE"] == "9822012346"
        ),
        None,
    )

    assert suresh is not None
    assert suresh["TRAINEE_ID"] == "SKL-2023-8841"
    assert suresh["TRAINEE_NAME"] == "PAWAR SURESH A"
    assert suresh["DOB"] == "12-11-2002"
    assert suresh["COURSE_CODE"] == "ELEC-101"
    assert suresh["COURSE_NAME"] == "Electrical Technician"
    assert suresh["COMPLETION"] == "Y"
    assert suresh["CERT_NO"] == "SKL-CERT-55102"
    assert suresh["CERT_DATE"] == "20-06-2026"


def test_skl_source_maps_to_training_record_contract() -> None:
    row = _read_rows()[0]

    canonical = apply_mapping(row, SKL_MAPPING)

    assert canonical == {
        "trainee_id": "SKL-2023-8841",
        "trainee_name": "Pawar Suresh A",
        "dob": "2002-11-12",
        "course_code": "ELEC-101",
        "course_name": "Electrical Technician",
        "completion_status": "COMPLETED",
        "certificate_no": "SKL-CERT-55102",
        "certificate_date": "2026-06-20",
    }
