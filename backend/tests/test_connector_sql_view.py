from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.connectors.errors import (
    ConnectorConfigurationError,
    ConnectorResponseError,
)
from app.connectors.factory import build_connector
from app.connectors.sql_view import SqlViewConnector

QUERY = (
    "SELECT STUD_ID, STUD_NM, DOB_STR, INST_CD, "
    "COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD "
    "FROM STUD_MST "
    "WHERE MOB_NO = :mobile AND DOB_STR = :dob"
)

MAPPING = {
    "enrolment_id": {
        "source": "STUD_ID",
        "transform": "strip",
    },
    "student_name": {
        "source": "STUD_NM",
        "transform": "title_case",
    },
    "dob": {
        "source": "DOB_STR",
        "transform": {"date": "%d-%m-%Y"},
    },
    "institution_code": {
        "source": "INST_CD",
        "transform": "strip",
    },
    "course_code": {
        "source": "COURSE_CD",
        "transform": "strip",
    },
    "year_of_study": {
        "source": "YR_OF_STUDY",
        "transform": "to_int",
    },
    "status": {
        "source": "ADM_STATUS",
        "transform": {
            "enum": {
                "A": "ACTIVE",
                "T": "TERMINATED",
                "D": "DROPPED",
            }
        },
    },
    "last_updated": {
        "source": "LAST_UPD",
        "transform": {"date": "%d-%m-%Y"},
    },
}


def create_edu_db(path) -> None:
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            CREATE TABLE STUD_MST (
                STUD_ID TEXT PRIMARY KEY,
                STUD_NM TEXT NOT NULL,
                DOB_STR TEXT NOT NULL,
                MOB_NO TEXT NOT NULL,
                INST_CD TEXT NOT NULL,
                COURSE_CD TEXT NOT NULL,
                YR_OF_STUDY INTEGER NOT NULL,
                ADM_STATUS TEXT NOT NULL,
                LAST_UPD TEXT
            )
            """
        )
        connection.execute(
            """
            INSERT INTO STUD_MST VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                "EDU/2022/00451",
                "PATIL RAHUL S",
                "04-03-2004",
                "9876543210",
                "PUN-ENG-014",
                "BTECH-CSE",
                3,
                "A",
                "10-07-2026",
            ),
        )
        connection.commit()


def make_connector(path) -> SqlViewConnector:
    return SqlViewConnector(
        connector_id=7,
        system_code="EDU",
        name="edu_enrolment",
        entity="enrolment",
        config={
            "file": str(path),
            "read_only": True,
            "query": QUERY,
        },
        lookup={
            "mobile_field": "MOB_NO",
            "dob_field": "DOB_STR",
            "dob_format": "%d-%m-%Y",
        },
        mapping=MAPPING,
    )


def test_sql_view_factory_builds_connector(tmp_path) -> None:
    connector = build_connector(
        connector_id=7,
        system_code="EDU",
        name="edu_enrolment",
        kind="SQL_VIEW",
        entity="enrolment",
        config={
            "file": str(tmp_path / "edu.db"),
            "read_only": True,
            "query": QUERY,
        },
        lookup={
            "mobile_field": "MOB_NO",
            "dob_field": "DOB_STR",
            "dob_format": "%d-%m-%Y",
        },
        mapping=MAPPING,
    )

    assert isinstance(connector, SqlViewConnector)


def test_sql_view_fetch_maps_legacy_row_to_canonical(tmp_path) -> None:
    database = tmp_path / "edu.db"
    create_edu_db(database)

    connector = make_connector(database)

    result = connector.fetch(
        mobile="9876543210",
        dob="2004-03-04",
        correlation_id="corr-edu-001",
    )

    assert result["entity"] == "enrolment"
    assert result["source_system"] == "EDU"
    assert result["external_id"] == "EDU/2022/00451"
    assert result["correlation_id"] == "corr-edu-001"

    assert result["record"] == {
        "enrolment_id": "EDU/2022/00451",
        "student_name": "Patil Rahul S",
        "dob": "2004-03-04",
        "institution_code": "PUN-ENG-014",
        "course_code": "BTECH-CSE",
        "year_of_study": 3,
        "status": "ACTIVE",
        "last_updated": "2026-07-10",
    }


def test_sql_view_accepts_legacy_dob_format(tmp_path) -> None:
    database = tmp_path / "edu.db"
    create_edu_db(database)

    result = make_connector(database).fetch(
        mobile="9876543210",
        dob="04-03-2004",
        correlation_id="corr-edu-002",
    )

    assert result["record"]["enrolment_id"] == "EDU/2022/00451"


def test_sql_view_missing_identity_raises(tmp_path) -> None:
    database = tmp_path / "edu.db"
    create_edu_db(database)

    with pytest.raises(ConnectorResponseError, match="record not found"):
        make_connector(database).fetch(
            mobile="9999999999",
            dob="2004-03-04",
            correlation_id="corr-edu-003",
        )


def test_sql_view_rejects_non_select_query(tmp_path) -> None:
    connector = SqlViewConnector(
        connector_id=7,
        system_code="EDU",
        name="edu_enrolment",
        entity="enrolment",
        config={
            "file": str(tmp_path / "edu.db"),
            "read_only": True,
            "query": "DELETE FROM STUD_MST",
        },
        lookup={
            "mobile_field": "MOB_NO",
            "dob_field": "DOB_STR",
            "dob_format": "%d-%m-%Y",
        },
        mapping=MAPPING,
    )

    with pytest.raises(
        ConnectorConfigurationError,
        match="must be a SELECT",
    ):
        connector.fetch(
            mobile="9876543210",
            dob="2004-03-04",
            correlation_id="corr-edu-004",
        )
