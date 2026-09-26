from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.connectors.errors import ConnectorTransportError
from app.connectors.repository import get_connector
from app.db import Base
from app.models import Connector, System


def test_simulated_system_down_blocks_connector() -> None:
    engine = create_engine(
        "sqlite:///:memory:",
    )

    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            System(
                code="REV",
                name="Revenue",
                owner_department="Revenue",
                protocol="XML",
                id_scheme="REV",
                auth_type="api_key",
                health="DOWN",
                simulate_down=True,
            )
        )

        session.add(
            Connector(
                system_code="REV",
                name="rev_income",
                kind="REST_XML",
                entity="income_certificate",
                config_json={
                    "base_url":
                        "http://127.0.0.1:8001",
                },
                lookup_json={},
                mapping_json={},
                status="ACTIVE",
                version=1,
            )
        )

        session.commit()

        try:
            get_connector(
                session,
                "rev_income",
            )
        except ConnectorTransportError as exc:
            assert (
                "source system is DOWN"
                in str(exc)
            )
        else:
            raise AssertionError(
                "Expected simulated outage "
                "to block connector loading"
            )
