from __future__ import annotations
# Ruff: these imports intentionally follow the backend sys.path bootstrap.
# ruff: noqa: E402, I001

import argparse
import csv
import sqlite3
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import bcrypt  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db import DB_PATH, SessionLocal, engine, init_db  # noqa: E402
from app.journeys.loader import load_journey_definition  # noqa: E402
from app.models import Connector, JourneyDef, System, User  # noqa: E402


DEMO_PASSWORD = "Demo@123"
SKL_PATH = PROJECT_ROOT / "data_drop" / "skills_registry.csv"
EDU_DB_PATH = PROJECT_ROOT / "mock_systems" / "edu" / "edu_legacy.db"
JOURNEYS_DIR = BACKEND_DIR / "app" / "journeys"


def password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def reset_database() -> None:
    engine.dispose()

    for path in (
        DB_PATH,
        Path(f"{DB_PATH}-wal"),
        Path(f"{DB_PATH}-shm"),
    ):
        path.unlink(missing_ok=True)

    init_db()



def write_edu_db() -> None:
    """Create the reproducible synthetic legacy EDU SQLite source."""
    EDU_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    EDU_DB_PATH.unlink(missing_ok=True)

    rows = [
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
        (
            "EDU/2022/00452",
            "PAWAR SURESH A",
            "12-11-2002",
            "9822012346",
            "PUN-ENG-015",
            "BTECH-CSE",
            3,
            "A",
            "10-07-2026",
        ),
    ]

    with sqlite3.connect(EDU_DB_PATH) as connection:
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
            INSERT INTO STUD_MST (
                STUD_ID,
                STUD_NM,
                DOB_STR,
                MOB_NO,
                INST_CD,
                COURSE_CD,
                YR_OF_STUDY,
                ADM_STATUS,
                LAST_UPD
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows[0],
        )
        connection.execute(
            """
            INSERT INTO STUD_MST (
                STUD_ID,
                STUD_NM,
                DOB_STR,
                MOB_NO,
                INST_CD,
                COURSE_CD,
                YR_OF_STUDY,
                ADM_STATUS,
                LAST_UPD
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows[1],
        )
        connection.commit()


def seed_users(session) -> None:
    users = [
        User(
            username="rahul.patil",
            password_hash=password_hash(DEMO_PASSWORD),
            role="citizen",
            master_id="SETU-CIT-000001",
            display_name="Rahul Patil",
            full_name="Rahul Patil",
            dob="2004-03-04",
            mobile="9876543210",
        ),
        User(
            username="suresh.pawar",
            password_hash=password_hash(DEMO_PASSWORD),
            role="citizen",
            master_id="SETU-CIT-000002",
            display_name="Suresh Pawar",
            full_name="Suresh Pawar",
            dob="2002-11-12",
            mobile="9822012346",
        ),
        User(
            username="officer1",
            password_hash=password_hash(DEMO_PASSWORD),
            role="officer",
            display_name="BSS Officer",
        ),
        User(
            username="admin1",
            password_hash=password_hash(DEMO_PASSWORD),
            role="admin",
            display_name="SETU Administrator",
        ),
    ]

    session.add_all(users)


def seed_systems(session) -> None:
    systems = [
        System(
            code="REV",
            name="Revenue Department – Certificates",
            owner_department="Revenue & Forest",
            protocol="XML over HTTP",
            id_scheme="REV-<10 digits>",
            auth_type="api_key",
            health="UP",
            simulate_down=False,
        ),
        System(
            code="EDU",
            name="Legacy Education Registry",
            owner_department="Education",
            protocol="SQLite / SQL_VIEW",
            id_scheme="EDU/YYYY/NNNNN",
            auth_type="local_file",
            health="UP",
            simulate_down=False,
        ),
        System(
            code="BSS",
            name="Benefit Scheme System",
            owner_department="Skills / Scholarship",
            protocol="REST / JSON",
            id_scheme="BSS-YYYY-NNNNNN",
            auth_type="api_token + webhook_hmac",
            health="UP",
            simulate_down=False,
        ),
        System(
            code="SKL",
            name="Skills & Employment Registry",
            owner_department="Skills & Employment",
            protocol="CSV",
            id_scheme="SKL-YYYY-NNNN",
            auth_type="none",
            health="UP",
            simulate_down=False,
        ),
    ]

    session.add_all(systems)


def seed_connectors(session) -> None:
    connectors = [
        Connector(
            system_code="REV",
            name="rev_income",
            kind="REST_XML",
            entity="income_certificate",
            config_json={
                "base_url": "http://127.0.0.1:8001",
                "path": "/certificates",
                "auth": {
                    "type": "api_key",
                    "secret_ref": "REV_API_KEY",
                },
                "timeout_seconds": 10,
            },
            lookup_json={
                "certificate_type": "INCOME",
                "dob_format": "%d/%m/%Y",
            },
            mapping_json={
                "cert_no": {
                    "source": "CertNo",
                    "transform": "strip",
                },
                "holder_name": {
                    "source": "Holder/Name",
                    "transform": "title_case",
                },
                "annual_income_inr": {
                    "source": "IncomeDetails/AnnualIncome",
                    "transform": "to_int",
                },
                "issue_date": {
                    "source": "IssueDate",
                    "transform": {"date": "%d/%m/%Y"},
                },
                "valid_until": {
                    "source": "ValidUntil",
                    "transform": {"date": "%d/%m/%Y"},
                },
                "issuing_authority": {
                    "source": "IssuingAuthority",
                    "transform": "strip",
                },
            },
            status="ACTIVE",
            version=1,
        ),
        Connector(
            system_code="EDU",
            name="edu_enrolment",
            kind="SQL_VIEW",
            entity="enrolment",
            config_json={
                "file": str(EDU_DB_PATH.relative_to(PROJECT_ROOT)),
                "read_only": True,
                "query": (
                    "SELECT STUD_ID, STUD_NM, DOB_STR, INST_CD, "
                    "COURSE_CD, YR_OF_STUDY, ADM_STATUS, LAST_UPD "
                    "FROM STUD_MST "
                    "WHERE MOB_NO = :mobile AND DOB_STR = :dob"
                ),
            },
            lookup_json={
                "mobile_field": "MOB_NO",
                "dob_field": "DOB_STR",
                "dob_format": "%d-%m-%Y",
            },
            mapping_json={
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
            },
            status="ACTIVE",
            version=1,
        ),
        Connector(
            system_code="BSS",
            name="bss_scholarship",
            kind="REST_JSON",
            entity="application",
            config_json={
                "base_url": "http://127.0.0.1:8002",
                "path_template": "/api/schemes/{scheme_code}/applications",
                "scheme_code": "SCHOL-PM",
                "auth": {
                    "type": "bearer",
                    "secret_ref": "BSS_API_TOKEN",
                },
                "timeout_seconds": 10,
            },
            lookup_json={},
            mapping_json={},
            status="ACTIVE",
            version=1,
        ),
    ]

    session.add_all(connectors)


def seed_journeys(session) -> None:
    scholarship_definition = load_journey_definition(
        JOURNEYS_DIR / "scholarship_v1.json"
    )
    youth_enterprise_definition = load_journey_definition(
        JOURNEYS_DIR / "youth_enterprise_v1.json"
    )

    scholarship = JourneyDef(
        id="scholarship_v1",
        version=1,
        name="Post-Matric Scholarship",
        status="ACTIVE",
        definition_json=scholarship_definition,
    )

    youth_enterprise = JourneyDef(
        id="youth_enterprise_v1",
        version=1,
        name="Youth Enterprise Support",
        status="ACTIVE",
        definition_json=youth_enterprise_definition,
    )

    session.add_all([scholarship, youth_enterprise])


def write_skl_csv() -> None:
    SKL_PATH.parent.mkdir(parents=True, exist_ok=True)

    headers = [
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

    rows = [
        [
            "SKL-2023-8841",
            "PAWAR SURESH A",
            "12-11-2002",
            "9822012346",
            "ELEC-101",
            "Electrical Technician",
            "Y",
            "SKL-CERT-55102",
            "20-06-2026",
        ],
    ]

    with SKL_PATH.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)


def seed() -> None:
    reset_database()
    write_edu_db()

    with SessionLocal() as session:
        seed_users(session)
        seed_systems(session)

        # Flush parent rows before inserting connectors with FK -> systems.code.
        session.flush()

        seed_connectors(session)
        seed_journeys(session)
        session.commit()

        users = session.scalars(select(User)).all()
        systems = session.scalars(select(System)).all()
        connectors = session.scalars(select(Connector)).all()
        journeys = session.scalars(select(JourneyDef)).all()

        print(f"users={len(users)}")
        print(f"systems={len(systems)}")
        print(f"connectors={len(connectors)}")
        print(f"journeys={len(journeys)}")

    write_skl_csv()

    print(f"database={DB_PATH}")
    print(f"skl_csv={SKL_PATH}")
    print("seed reset complete")
    print(f"demo password={DEMO_PASSWORD}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset and seed SETU demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete and recreate the SQLite database, then seed demo data.",
    )
    args = parser.parse_args()

    if not args.reset:
        parser.error("Use --reset for the canonical clean demo seed.")

    seed()


if __name__ == "__main__":
    main()
