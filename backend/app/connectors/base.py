from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .errors import ConnectorConfigurationError


class Connector(ABC):
    """Minimal runtime interface shared by connector implementations."""

    def __init__(
        self,
        *,
        connector_id: int,
        system_code: str,
        name: str,
        entity: str,
        config: dict[str, Any],
        lookup: dict[str, Any],
        mapping: dict[str, Any],
    ) -> None:
        self.connector_id = connector_id
        self.system_code = system_code
        self.name = name
        self.entity = entity
        self.config = config
        self.lookup = lookup
        self.mapping = mapping

    def submit(
        self,
        *,
        applicant: dict[str, Any],
        scheme_code: str,
        data: dict[str, Any],
        application_id: int | str,
        step_id: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        """Submit data to a destination system."""
        raise ConnectorConfigurationError(
            f"{self.name}: submit operation is not supported"
        )

    @abstractmethod
    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict[str, Any]:
        """Fetch and return canonical data."""
        raise NotImplementedError
