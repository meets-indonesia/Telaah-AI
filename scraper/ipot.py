import logging
from typing import Any

from scrapling.fetchers import Fetcher

logger = logging.getLogger("telaah.ipot")


def get_broker_summary(
    symbol: str, start: str | None = None, end: str | None = None
) -> dict[str, Any] | None:
    """Best-effort IPOT fallback.

    The public endpoint was returning 502 during recon. A non-200 response is
    reported as unavailable, never converted into fake broker rows.
    """
    clean = symbol.upper().strip()
    url = (
        "https://www.ipotnews.com/m/ipo/module/saham/include/"
        f"data-brokersummary.php?stock={clean}"
    )
    if start:
        url += f"&start={start}"
    if end:
        url += f"&end={end}"

    try:
        page = Fetcher.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.ipotnews.com/",
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=20,
        )
    except Exception as exc:  # noqa: BLE001
        logger.info("IPOT request failed: %s", exc)
        return None

    if page.status != 200:
        logger.info("IPOT returned HTTP %s", page.status)
        return None

    # The page layout is unstable and has been down since late 2026. Do not
    # invent a parser from an unavailable fixture; the caller degrades to
    # foreign-flow-only FlowLens.
    logger.info("IPOT responded but the parser is not enabled in this build.")
    return None
