import argparse
import json


from backend.app.db import Base, engine, SessionLocal
from backend.app.models import (
    User,
    MasterCitizen,
    System,
    JourneyDef,
)


PERSONAS = [
    ("Rahul Patil", "2002-05-14", "9000000001"),
    ("Sneha Deshmukh", "2002-08-21", "9000000002"),
    ("Aarti Jadhav", "2003-01-10", "9000000003"),
    ("Priya Kulkarni", "2002-11-30", "9000000004"),
    ("Imran Shaikh", "2001-06-18", "9000000005"),
    ("Vikas More", "2002-03-25", "9000000006"),
    ("Meera Gaikwad", "2003-09-12", "9000000007"),
    ("Suresh Pawar", "2002-12-05", "9000000008"),
]

SYSTEMS = [
    {
        "code": "REV",
        "name": "Revenue Department",
        "owner_department": "Revenue Department",
        "steward_contact": "rev-steward@example.gov",
        "protocol": "XML over HTTP",
        "id_scheme": "REV-<10 digits>",
        "auth_type": "api_key",
        "health": "UP",
        "simulate_down": False,
    },
    {
        "code": "EDU",
        "name": "Education Department",
        "owner_department": "Education Department",
        "steward_contact": "edu-steward@example.gov",
        "protocol": "SQLite SQL_VIEW",
        "id_scheme": "EDU/YYYY/NNNNN",
        "auth_type": "none",
        "health": "UP",
        "simulate_down": False,
    },
    {
        "code": "BSS",
        "name": "Benefit Scheme System",
        "owner_department": "Benefit Scheme Department",
        "steward_contact": "bss-steward@example.gov",
        "protocol": "REST/JSON",
        "id_scheme": "BSS-<year>-<seq>",
        "auth_type": "sso",
        "health": "UP",
        "simulate_down": False,
    },
    {
        "code": "SKL",
        "name": "Skills & Employment Registry",
        "owner_department": "Skills & Employment Department",
        "steward_contact": "skl-steward@example.gov",
        "protocol": "CSV",
        "id_scheme": "SKL-YYYY-NNNN",
        "auth_type": "none",
        "health": "UP",
        "simulate_down": False,
    },
]

JOURNEYS = [
    {
        "version": 1,
        "name": "Post-Matric Scholarship (illustrative)",
        "definition": {
            "id": "scholarship_v1",
            "name": "Post-Matric Scholarship (illustrative)",
            "sla_hours": 72,
            "steps": [
                {
                    "id": "consent",
                    "type": "consent",
                    "purpose": "scholarship_eligibility",
                    "fields": ["income", "caste_category", "enrolment"],
                },
                {
                    "id": "fetch_income",
                    "type": "fetch",
                    "connector": "rev_income",
                },
                {
                    "id": "fetch_caste",
                    "type": "fetch",
                    "connector": "rev_caste",
                },
                {
                    "id": "fetch_enrolment",
                    "type": "fetch",
                    "connector": "edu_enrolment",
                },
                {
                    "id": "validate",
                    "type": "validate",
                },
                {
                    "id": "decide",
                    "type": "rule",
                    "rule": "scholarship_v1",
                },
                {
                    "id": "submit",
                    "type": "push",
                    "connector": "bss_submit",
                    "scheme_code": "SCHOL-PM",
                },
                {
                    "id": "await_decision",
                    "type": "wait_event",
                    "event": "bss.application.decided",
                    "sla_hours": 48,
                },
            ],
        },
        "status": "ACTIVE",
    },
    {
        "version": 1,
        "name": "Youth Enterprise",
        "definition": {
            "id": "youth_enterprise_v1",
            "name": "Youth Enterprise",
            "sla_hours": 72,
            "steps": [
                {
                    "id": "consent",
                    "type": "consent",
                    "purpose": "youth_enterprise_eligibility",
                    "fields": ["income", "training"],
                },
                {
                    "id": "fetch_income",
                    "type": "fetch",
                    "connector": "rev_income",
                },
                {
                    "id": "fetch_training",
                    "type": "fetch",
                    "connector": "skl_training",
                },
                {
                    "id": "validate",
                    "type": "validate",
                },
                {
                    "id": "decide",
                    "type": "rule",
                    "rule": "youth_enterprise_v1",
                },
                {
                    "id": "submit",
                    "type": "push",
                    "connector": "bss_submit",
                    "scheme_code": "STARTUP-YOUTH",
                },
                {
                    "id": "await_decision",
                    "type": "wait_event",
                    "event": "bss.application.decided",
                    "sla_hours": 48,
                },
            ],
        },
        "status": "ACTIVE",
    },
]


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_database() -> None:
    with SessionLocal() as db:
        for index, (name, dob, mobile) in enumerate(PERSONAS, start=1):
            master_id = f"SETU-CIT-{index:06d}"

            db.add(
                MasterCitizen(
                    master_id=master_id,
                    full_name=name,
                    dob=dob,
                    mobile=mobile,
                    golden_json=json.dumps(
                        {
                            "full_name": name,
                            "dob": dob,
                            "mobile": mobile,
                        }
                    ),
                    provenance_json=json.dumps({}),
                )
            )

            db.add(
                User(
                    username=f"citizen{index}",
                    password_hash="$2b$12$02grZ7bwvvCJYg5hPohyaunetgrmvksBBWNDAv/M4Ifxw7MTHfss.",
                    role="citizen",
                    master_id=master_id,
                    display_name=name,
                    locale="en-IN",
                )
            )

        for index in range(1, 21):
            citizen_number = index + 8
            master_id = f"SETU-CIT-{citizen_number:06d}"

            db.add(
                MasterCitizen(
                    master_id=master_id,
                    full_name=f"Filler Citizen {index}",
                    dob="2002-01-01",
                    mobile=f"900000{citizen_number:04d}",
                    golden_json=json.dumps({}),
                    provenance_json=json.dumps({}),
                )
            )

            db.add(
                User(
                    username=f"citizen{citizen_number}",
                    password_hash="$2b$12$02grZ7bwvvCJYg5hPohyaunetgrmvksBBWNDAv/M4Ifxw7MTHfss.",
                    role="citizen",
                    master_id=master_id,
                    display_name=f"Filler Citizen {index}",
                    locale="en-IN",
                )
            )

        db.add(
            User(
                username="officer1",
                password_hash="$2b$12$02grZ7bwvvCJYg5hPohyaunetgrmvksBBWNDAv/M4Ifxw7MTHfss.",
                role="officer",
                master_id=None,
                display_name="Department Officer",
                locale="en-IN",
            )
        )

        db.add(
            User(
                username="admin1",
                password_hash="$2b$12$02grZ7bwvvCJYg5hPohyaunetgrmvksBBWNDAv/M4Ifxw7MTHfss.",
                role="admin",
                master_id=None,
                display_name="SETU Admin",
                locale="en-IN",
            )
        )

        for system_data in SYSTEMS:
            db.add(System(**system_data))

        for journey in JOURNEYS:
            db.add(
                JourneyDef(
                    version=journey["version"],
                    name=journey["name"],
                    definition_json=json.dumps(journey["definition"]),
                    status=journey["status"],
                )
            )

        db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed/reset SETU demo database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate all tables before seeding.",
    )
    args = parser.parse_args()

    if args.reset:
        reset_database()
        print("Database reset complete.")

    seed_database()
    print("Seed complete.")
    print("Created 28 citizen personas/users + officer1 + admin1.")
    print("Created REV, EDU, BSS, SKL systems.")
    print("Created scholarship_v1 and youth_enterprise_v1 journeys.")


if __name__ == "__main__":
    main()
