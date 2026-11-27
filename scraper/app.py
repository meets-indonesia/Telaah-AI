import logging
from dataclasses import asdict
from typing import Any

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

from . import idx, ipot, stockbit
from .errors import UpstreamError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telaah.scraper")

app = FastAPI(title="Telaah IDX Scraper", version="0.1.0")


@app.exception_handler(UpstreamError)
async def upstream_error_handler(_request, exc: UpstreamError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": exc.message, "kind": exc.kind},
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "telaah-scraper",
        "engine": "scrapling-fetcher",
        "stockbit": asdict(stockbit.status()),
    }


@app.get("/v1/idx/foreign-flow/{symbol}")
def foreign_flow(
    symbol: str,
    length: int = Query(default=90, ge=1, le=180),
) -> dict[str, Any]:
    return idx.get_foreign_flow(symbol, length)


@app.get("/v1/idx/profile/{symbol}")
def profile(symbol: str) -> dict[str, Any]:
    result = idx.get_profile(symbol)
    if not result:
        return JSONResponse(
            status_code=404,
            content={"error": f"Profil IDX {symbol.upper()} tidak ditemukan."},
        )
    return result


@app.get("/v1/idx/announcements/{symbol}")
def announcements(
    symbol: str,
    days: int = Query(default=365, ge=1, le=730),
    page_size: int = Query(default=100, ge=1, le=1000),
) -> dict[str, Any]:
    from datetime import datetime, timedelta, timezone

    today = datetime.now(timezone.utc)
    date_from = (today - timedelta(days=days)).strftime("%Y%m%d")
    date_to = today.strftime("%Y%m%d")
    return {
        "symbol": symbol.upper(),
        "results": idx.get_announcements(
            symbol, page_size=page_size, date_from=date_from, date_to=date_to
        ),
        "source": "idx",
    }


@app.get("/v1/idx/insider/{symbol}")
def insider(
    symbol: str,
    days: int = Query(default=365, ge=1, le=730),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict[str, Any]:
    return {
        "symbol": symbol.upper(),
        "results": idx.get_insider_filings(symbol, days=days, limit=limit),
        "source": "idx",
    }


@app.get("/v1/idx/insider-feed")
def insider_feed(
    days: int = Query(default=30, ge=1, le=180),
    limit: int = Query(default=25, ge=1, le=50),
) -> dict[str, Any]:
    return idx.get_insider_feed(days=days, limit=limit)


@app.get("/v1/idx/suspensions")
def suspensions(
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    return {
        "results": idx.get_suspensions(limit=limit),
        "source": "idx",
    }


@app.get("/v1/idx/calendar")
def calendar(
    month: str | None = Query(default=None),
) -> dict[str, Any]:
    return {
        "results": idx.get_calendar(month=month),
        "source": "idx",
    }


@app.get("/v1/ipot/broker-summary/{symbol}")
def ipot_broker_summary(
    symbol: str,
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
) -> dict[str, Any]:
    result = ipot.get_broker_summary(symbol, start=start, end=end)
    if result is None:
        return {
            "available": False,
            "source": "ipot",
            "reason": "Endpoint IPOT sedang tidak tersedia atau parser belum aktif.",
            "data": [],
        }
    return result


@app.get("/v1/stockbit/status")
def stockbit_status() -> dict[str, Any]:
    return asdict(stockbit.status())


@app.get("/v1/stockbit/quote/{symbol}")
def stockbit_quote(symbol: str) -> dict[str, Any]:
    return stockbit.get_quote(symbol)


@app.get("/v1/stockbit/chart/{symbol}")
def stockbit_chart(
    symbol: str,
    timeframe: str = Query(default="1Y"),
) -> dict[str, Any]:
    return stockbit.get_chart(symbol, timeframe=timeframe)


@app.get("/v1/stockbit/broker-summary/{symbol}")
def stockbit_broker_summary(
    symbol: str,
    days: int = Query(default=14, ge=1, le=365),
) -> dict[str, Any]:
    return stockbit.get_broker_summary(symbol, days=days)


@app.get("/v1/broker-summary/{symbol}")
def broker_summary(
    symbol: str,
    days: int = Query(default=14, ge=1, le=365),
) -> dict[str, Any]:
    try:
        return stockbit.get_broker_summary(symbol, days=days)
    except UpstreamError as exc:
        if exc.kind in ("not_configured", "expired", "blocked", "network", "provider", "not_found"):
            ipot_result = ipot.get_broker_summary(symbol)
            if ipot_result:
                return ipot_result
            return {
                "available": False,
                "source": "none",
                "reason": exc.message,
                "data": [],
            }
        raise
