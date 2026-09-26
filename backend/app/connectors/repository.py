from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Connector as ConnectorModel
from ..models import System
from .base import Connector
from .errors import ConnectorConfigurationError
from .factory import build_connector


def get_connector(
    db: Session,
    name: str,
) -> Connector:
    """Load an active connector definition and build its runtime adapter."""

    row = (
        db.query(ConnectorModel)
        .filter(ConnectorModel.name == name)
        .one_or_none()
    )

    if row is None:
        raise ConnectorConfigurationError(
            f"Connector not found: {name}"
        )

    status = getattr(row.status, "value", row.status)

    if status != "ACTIVE":
        raise ConnectorConfigurationError(
            f"Connector is not ACTIVE: {name}"
        )

    system = db.get(
        System,
        row.system_code,
    )

    if system is not None and (
        system.simulate_down
        or system.health == "DOWN"
    ):
        from .errors import ConnectorTransportError

        raise ConnectorTransportError(
            f"{row.system_code}: source system is DOWN (simulated)"
        )

    return build_connector(
        connector_id=row.id,
        system_code=row.system_code,
        name=row.name,
        kind=row.kind,
        entity=row.entity,
        config=row.config_json,
        lookup=row.lookup_json,
        mapping=row.mapping_json,
    )
