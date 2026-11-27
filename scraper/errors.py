class UpstreamError(Exception):
    """A source failed or is temporarily blocked."""

    def __init__(self, message: str, *, status: int = 502, kind: str = "upstream"):
        super().__init__(message)
        self.message = message
        self.status = status
        self.kind = kind
