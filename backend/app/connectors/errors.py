class ConnectorError(Exception):
    """Base error for connector execution."""


class ConnectorConfigurationError(ConnectorError):
    """Connector configuration is invalid."""


class ConnectorTransportError(ConnectorError):
    """Connector could not communicate with the source system."""


class ConnectorResponseError(ConnectorError):
    """Source system returned an unusable response."""


class MappingError(ConnectorError):
    """Source data could not be mapped to canonical data."""
