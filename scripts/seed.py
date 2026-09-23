from __future__ import annotations
# Ruff: these imports intentionally follow the backend sys.path bootstrap.
# ruff: noqa: E402, I001

import argparse
import csv
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import bcrypt  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db import DB_PATH, SessionLocal, engine, init_db  # noqa: E402
from app.models import Connector, JourneyDef, System, User  # noqa: E402


DEMO_PASSWORD = "Demo@123"
SKL_PATH = PROJECT_ROOT / "data_drop" / "skills_registry.csv"
EDU_DB_PATH = PROJECT_ROOT / "mock_systems" / "edu" / "edu_legacy.db"


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
            mobile="9822012345",
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
                "base_url": "http://localhost:8001",
                "path": "/api/certificates/income",
            },
            lookup_json={
                "mobile_field": "mobile",
                "dob_field": "dob",
                "dob_format": "%Y-%m-%d",
            },
            mapping_json={},
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
            },
            lookup_json={
                "mobile_field": "MOB_NO",
                "dob_field": "DOB_STR",
                "dob_format": "%d-%m-%Y",
            },
            mapping_json={},
            status="ACTIVE",
            version=1,
        ),
        Connector(
            system_code="BSS",
            name="bss_scholarship",
            kind="REST_JSON",
            entity="application",
            config_json={
                "base_url": "http://localhost:8002",
                "path_template": "/api/schemes/{scheme_code}/applications",
            },
            lookup_json={},
            mapping_json={},
            status="ACTIVE",
            version=1,
        ),
    ]

    session.add_all(connectors)


def seed_journeys(session) -> None:
    scholarship = JourneyDef(
        id="scholarship_v1",
        version=1,
        name="Post-Matric Scholarship",
        status="ACTIVE",
        definition_json={
            "consent_purpose": "scholarship_eligibility",
            "steps": [
                {
                    "id": "fetch_income",
                    "type": "fetch",
                    "connector": "rev_income",
                    "entity": "income_certificate",
                    "configured": True,
                },
                {
                    "id": "fetch_enrolment",
                    "type": "fetch",
                    "connector": "edu_enrolment",
                    "entity": "enrolment",
                    "configured": True,
                },
                {
                    "id": "evaluate_eligibility",
                    "type": "decision",
                    "rule": "post_matric_income_250000",
                    "configured": True,
                },
                {
                    "id": "submit_bss",
                    "type": "submit",
                    "connector": "bss_scholarship",
                    "configured": True,
                },
            ],
        },
    )

    youth_enterprise = JourneyDef(
        id="youth_enterprise_v1",
        version=1,
        name="Youth Enterprise Support",
        status="ACTIVE",
        definition_json={
            "consent_purpose": "youth_enterprise_eligibility",
            "steps": [
                {
                    "id": "fetch_training",
                    "type": "fetch",
                    "connector": "skl_training",
                    "entity": "training_record",
                    "configured": False,
                },
            ],
        },
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
