from __future__ import annotations

from typing import Any

from .base import Connector
from .errors import ConnectorConfigurationError
from .rest_json import RestJsonConnector
from .rest_xml import RestXmlConnector


def build_connector(
    *,
    connector_id: int,
    system_code: str,
    name: str,
    kind: str,
    entity: str,
    config: dict[str, Any],
    lookup: dict[str, Any],
    mapping: dict[str, Any],
) -> Connector:
    """Build a runtime connector from persisted connector configuration."""

    common = {
        "connector_id": connector_id,
        "system_code": system_code,
        "name": name,
        "entity": entity,
        "config": config,
        "lookup": lookup,
        "mapping": mapping,
    }

    if kind == "REST_JSON":
        return RestJsonConnector(**common)

    if kind == "REST_XML":
        return RestXmlConnector(**common)

    raise ConnectorConfigurationError(
        f"Unsupported connector kind: {kind!r}"
    )
