import base64
import json
import os
import threading
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote

from scrapling.fetchers import Fetcher

from .cache import TTLCache
from .errors import UpstreamError

WIB = timezone(timedelta(hours=7))

EXODUS = "https://exodus.stockbit.com"
REFRESH_URL = f"{EXODUS}/login/refresh"
SESSION_CHECK_URL = f"{EXODUS}/company-price-feed/market-time/session"
SESSION_PATH = Path(
    os.getenv("STOCKBIT_SESSION_FILE", "data/stockbit_session.json")
)
REFRESH_BUFFER_SECONDS = 3600
REQUEST_TIMEOUT_SECONDS = 25
LOCK = threading.RLock()
PACING_LOCK = threading.Lock()
_last_request_at = 0.0


@dataclass
class Session:
    access: str = ""
    refresh: str = ""


@dataclass
class SessionStatus:
    configured: bool
    logged_in: bool
    expired: bool
    source: str
    access_expires_at: str | None = None
    refresh_expires_at: str | None = None
    limitations: list[str] | None = None


def _looks_like_jwt(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    parts = value.split(".")
    return len(parts) == 3 and parts[0].startswith("eyJ") and all(parts)


def _find_slot(value: Any, slot: str) -> str | None:
    if isinstance(value, dict):
        if slot in value:
            candidate = value[slot]
            if isinstance(candidate, str) and _looks_like_jwt(candidate):
                return candidate
            if isinstance(candidate, dict):
                token = candidate.get("token")
                if _looks_like_jwt(token):
                    return token
        for child in value.values():
            found = _find_slot(child, slot)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_slot(child, slot)
            if found:
                return found
    return None


def parse_credential_storage(raw: str) -> Session | None:
    """Parse stockbit.com's credentialStorage cookie or a bare refresh JWT."""
    if not raw or not raw.strip():
        return None
    text = raw.strip()
    decoded = unquote(unquote(text))
    for candidate in (decoded, text):
        try:
            value = json.loads(candidate)
        except Exception:  # noqa: BLE001
            continue
        access = _find_slot(value, "access")
        refresh = _find_slot(value, "refresh")
        if refresh:
            return Session(access=access or "", refresh=refresh)
    if _looks_like_jwt(text):
        return Session(access="", refresh=text)
    return None


def jwt_expiry(token: str) -> int | None:
    if not _looks_like_jwt(token):
        return None
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        exp = data.get("exp")
        return int(exp) if isinstance(exp, (int, float)) else None
    except Exception:  # noqa: BLE001
        return None


def _iso(epoch: int | None) -> str | None:
    if not epoch:
        return None
    return datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat()


def _load_file() -> tuple[Session, str]:
    if SESSION_PATH.exists():
        try:
            data = json.loads(SESSION_PATH.read_text())
            return (
                Session(
                    access=str(data.get("access") or ""),
                    refresh=str(data.get("refresh") or ""),
                ),
                "file",
            )
        except Exception:  # noqa: BLE001
            pass
    refresh = os.getenv("STOCKBIT_REFRESH_TOKEN", "").strip()
    access = os.getenv("STOCKBIT_ACCESS_TOKEN", "").strip()
    if refresh or access:
        return Session(access=access, refresh=refresh), "env"
    return Session(), "missing"


def _save_file(session: Session) -> None:
    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = SESSION_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps(asdict(session), indent=2))
    try:
        temporary.chmod(0o600)
    except OSError:
        pass
    temporary.replace(SESSION_PATH)
    try:
        SESSION_PATH.chmod(0o600)
    except OSError:
        pass


def _headers(bearer: str) -> dict[str, str]:
    return {
        "authorization": f"Bearer {bearer}",
        "accept": "application/json",
        "origin": "https://stockbit.com",
        "referer": "https://stockbit.com/",
        "content-type": "application/json",
    }


def _pace() -> None:
    global _last_request_at
    with PACING_LOCK:
        wait = 1.0 - (time.time() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.time()


def _parse_refresh(body: str, previous: Session) -> Session:
    try:
        value = json.loads(body)
    except Exception as exc:  # noqa: BLE001
        raise UpstreamError(
            "Stockbit refresh tidak mengembalikan JSON.", kind="provider"
        ) from exc
    access = _find_slot(value, "access")
    refresh = _find_slot(value, "refresh") or previous.refresh
    if not access:
        raise UpstreamError(
            "Stockbit refresh tidak mengembalikan access token.", kind="provider"
        )
    return Session(access=access, refresh=refresh)


def _is_expired_error(status: int, body: str) -> bool:
    if status == 401:
        return True
    if status != 403:
        return False
    try:
        json.loads(body)
        return True
    except Exception:  # noqa: BLE001
        return False


def _refresh(session: Session) -> Session:
    if not session.refresh:
        raise UpstreamError(
            "Sesi Stockbit belum diatur. Login ke Stockbit lalu simpan credentialStorage.",
            status=503,
            kind="not_configured",
        )
    _pace()
    try:
        response = Fetcher.post(
            REFRESH_URL,
            headers=_headers(session.refresh),
            json={},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except Exception as exc:  # noqa: BLE001
        raise UpstreamError(
            f"Stockbit refresh gagal: {exc}", kind="network"
        ) from exc

    body = bytes(response.body or b"").decode("utf-8", "ignore")
    if response.status == 403 and not body.lstrip().startswith("{"):
        raise UpstreamError(
            "Stockbit CDN menolak request (HTML 403). Coba lagi nanti.",
            kind="blocked",
        )
    if not (200 <= response.status < 300):
        if _is_expired_error(response.status, body):
            raise UpstreamError(
                "Sesi Stockbit kedaluwarsa. Login ulang ke Stockbit.",
                status=503,
                kind="expired",
            )
        raise UpstreamError(
            f"Stockbit refresh gagal: HTTP {response.status}.", kind="provider"
        )

    refreshed = _parse_refresh(body, session)
    _save_file(refreshed)
    return refreshed


def _access_token() -> str:
    with LOCK:
        session, _ = _load_file()
        if session.access:
            expiry = jwt_expiry(session.access)
            if expiry is None or expiry - time.time() > REFRESH_BUFFER_SECONDS:
                return session.access
        if session.refresh:
            refreshed = _refresh(session)
            return refreshed.access
        raise UpstreamError(
            "Sesi Stockbit belum diatur. Login ke Stockbit lalu simpan credentialStorage.",
            status=503,
            kind="not_configured",
        )


def _request_json(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{EXODUS}{path}"
    for attempt in range(2):
        token = _access_token()
        _pace()
        try:
            response = Fetcher.get(
                url,
                params=params,
                headers=_headers(token),
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(
                f"Stockbit request gagal: {exc}", kind="network"
            ) from exc

        body = bytes(response.body or b"").decode("utf-8", "ignore")
        if response.status == 403 and not body.lstrip().startswith("{"):
            raise UpstreamError(
                "Stockbit CDN menolak request (HTML 403). Coba lagi nanti.",
                kind="blocked",
            )
        if _is_expired_error(response.status, body) and attempt == 0:
            with LOCK:
                session, _ = _load_file()
                _refresh(session)
            continue
        if response.status == 404:
            raise UpstreamError(
                f"Stockbit tidak menemukan {path}.", status=404, kind="not_found"
            )
        if not (200 <= response.status < 300):
            raise UpstreamError(
                f"Stockbit membalas HTTP {response.status}.", kind="provider"
            )
        try:
            return json.loads(body)
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(
                "Stockbit mengembalikan JSON tidak valid.", kind="provider"
            ) from exc

    raise UpstreamError("Stockbit menolak sesi setelah refresh.", status=503, kind="expired")


def status() -> SessionStatus:
    session, source = _load_file()
    access_expiry = jwt_expiry(session.access) if session.access else None
    refresh_expiry = jwt_expiry(session.refresh) if session.refresh else None
    now = time.time()
    access_fresh = bool(access_expiry and access_expiry > now)
    refresh_fresh = bool(refresh_expiry and refresh_expiry > now)
    configured = bool(session.access or session.refresh)
    limitations: list[str] = []
    if not configured:
        limitations.append(
            "Sesi Stockbit belum diatur; broker summary memakai IPOT atau tidak tersedia."
        )
    elif not refresh_fresh and not access_fresh:
        limitations.append("Sesi Stockbit kedaluwarsa; login ulang diperlukan.")
    elif not refresh_fresh:
        limitations.append(
            "Refresh token Stockbit sudah lewat; sesi berhenti saat access token habis."
        )
    return SessionStatus(
        configured=configured,
        logged_in=configured and (access_fresh or refresh_fresh),
        expired=configured and not access_fresh and not refresh_fresh,
        source=source,
        access_expires_at=_iso(access_expiry),
        refresh_expires_at=_iso(refresh_expiry),
        limitations=limitations,
    )


def _number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", ""))
        except ValueError:
            return None
    return None


def parse_broker_summary(
    payload: dict[str, Any], symbol: str, fallback_date: str
) -> dict[str, Any]:
    data = payload.get("data") or {}
    summary = data.get("broker_summary") or {}
    buyers = summary.get("brokers_buy") or []
    sellers = summary.get("brokers_sell") or []

    by_code: dict[str, dict[str, Any]] = {}

    def row_for(code: str) -> dict[str, Any]:
        return by_code.setdefault(
            code,
            {
                "broker_code": code,
                "bfreq": 0.0,
                "blot": 0.0,
                "bval": 0.0,
                "bavg_per_share": 0.0,
                "sfreq": 0.0,
                "slot": 0.0,
                "sval": 0.0,
                "savg_per_share": 0.0,
            },
        )

    for row in buyers:
        code = str(row.get("netbs_broker_code") or "").strip()
        if not code:
            continue
        entry = row_for(code)
        entry["blot"] = _number(row.get("blot")) or 0.0
        entry["bval"] = _number(row.get("bval")) or 0.0
        entry["bfreq"] = _number(row.get("freq")) or 0.0
        avg = _number(row.get("netbs_buy_avg_price"))
        entry["bavg_per_share"] = (
            avg
            if avg is not None
            else (entry["bval"] / (entry["blot"] * 100) if entry["blot"] else 0.0)
        )

    for row in sellers:
        code = str(row.get("netbs_broker_code") or "").strip()
        if not code:
            continue
        entry = row_for(code)
        entry["slot"] = _number(row.get("slot")) or 0.0
        entry["sval"] = _number(row.get("sval")) or 0.0
        entry["sfreq"] = _number(row.get("freq")) or 0.0
        avg = _number(row.get("netbs_sell_avg_price"))
        entry["savg_per_share"] = (
            avg
            if avg is not None
            else (entry["sval"] / (entry["slot"] * 100) if entry["slot"] else 0.0)
        )

    rows = []
    for entry in by_code.values():
        entry["nlot"] = entry["blot"] - entry["slot"]
        entry["nval"] = entry["bval"] - entry["sval"]
        entry["navg_per_share"] = (
            entry["nval"] / (entry["nlot"] * 100) if entry["nlot"] else 0.0
        )
        rows.append(entry)

    rows.sort(key=lambda item: item["bval"] + item["sval"], reverse=True)
    end_date = data.get("to") or fallback_date
    return {
        "symbol": symbol.upper(),
        "start": data.get("from") or fallback_date,
        "end": end_date,
        "data": [{"date": end_date, "summary": rows}] if rows else [],
        "source": "stockbit",
        "coverage": "full",
        "buyer_count": (data.get("bandar_detector") or {}).get("total_buyer"),
        "seller_count": (data.get("bandar_detector") or {}).get("total_seller"),
    }


def get_broker_summary(symbol: str, days: int = 14) -> dict[str, Any]:
    clean = symbol.upper().strip()
    days = max(1, min(days, 365))
    today = datetime.now(WIB).date()
    start = today - timedelta(days=days - 1)
    payload = _request_json(
        f"/marketdetectors/{clean}",
        {
            "transaction_type": "TRANSACTION_TYPE_GROSS",
            "market_board": "MARKET_BOARD_ALL",
            "investor_type": "INVESTOR_TYPE_ALL",
            "from": start.isoformat(),
            "to": today.isoformat(),
            "limit": "1000",
        },
    )
    return parse_broker_summary(payload, clean, today.isoformat())


def _check_access(access: str) -> bool:
    if not access:
        return False
    _pace()
    try:
        response = Fetcher.get(
            SESSION_CHECK_URL,
            headers=_headers(access),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except Exception:  # noqa: BLE001
        return False
    return 200 <= response.status < 300


def login_with_raw(raw: str) -> SessionStatus:
    parsed = parse_credential_storage(raw)
    if not parsed:
        raise UpstreamError(
            "Nilai credentialStorage tidak valid. Salin cookie atau refresh token Stockbit.",
            kind="config",
        )
    with LOCK:
        if parsed.access and _check_access(parsed.access):
            _save_file(parsed)
            return status()
        if parsed.refresh:
            refreshed = _refresh(parsed)
            _save_file(refreshed)
            return status()
    raise UpstreamError(
        "Sesi Stockbit tidak dapat divalidasi. Login ulang lalu salin credentialStorage.",
        status=503,
        kind="expired",
    )


def clear_session() -> None:
    if SESSION_PATH.exists():
        SESSION_PATH.unlink()


CHART_CACHE = TTLCache()
QUOTE_CACHE = TTLCache()
CHART_TIMEFRAMES = {"1D": "1w", "1W": "1w", "1Y": "1y", "5Y": "5y"}


def _chart_time(row: dict[str, Any]) -> int | None:
    raw_ms = _number(row.get("date"))
    if raw_ms is not None and raw_ms > 0:
        return int(raw_ms // 1000)
    formatted = str(row.get("formatted_date") or "").strip()
    if not formatted:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(formatted, fmt).replace(tzinfo=WIB)
            return int(parsed.timestamp())
        except ValueError:
            continue
    return None


def parse_quote(payload: dict[str, Any], symbol: str) -> dict[str, Any]:
    data = payload.get("data") or {}
    last = _number(data.get("lastprice")) or _number(data.get("last")) or 0.0
    change = _number(data.get("change"))
    reported_close = _number(data.get("close"))
    previous = (
        last - change
        if change is not None
        else (reported_close if reported_close is not None else 0.0)
    )
    change_pct = (
        round(((last - previous) / previous) * 100, 2) if previous > 0 else 0.0
    )

    def top_price(rows: Any) -> float | None:
        if isinstance(rows, list) and rows:
            return _number((rows[0] or {}).get("price"))
        return None

    def threshold(value: Any) -> float | None:
        if isinstance(value, dict):
            return _number(value.get("value"))
        return _number(value)

    def levels(rows: Any) -> list[dict[str, float]]:
        out: list[dict[str, float]] = []
        if isinstance(rows, list):
            for row in rows[:5]:
                if not isinstance(row, dict):
                    continue
                price = _number(row.get("price"))
                volume = _number(row.get("volume"))
                if price is not None and price > 0:
                    out.append({"price": price, "volume": volume or 0.0})
        return out

    return {
        "symbol": str(data.get("symbol") or symbol).upper(),
        "last": last,
        "open": _number(data.get("open")),
        "high": _number(data.get("high")),
        "low": _number(data.get("low")),
        "previous_close": previous,
        "change": change,
        "change_pct": change_pct,
        "volume": _number(data.get("volume")),
        "value": _number(data.get("value")),
        "frequency": _number(data.get("frequency")),
        "foreign_buy": _number(data.get("fbuy")),
        "foreign_sell": _number(data.get("fsell")),
        "foreign_net": _number(data.get("fnet")),
        "foreign_current": bool(data.get("has_foreign_bs")),
        "bid": top_price(data.get("bid")),
        "offer": top_price(data.get("offer")),
        "bids": levels(data.get("bid")),
        "offers": levels(data.get("offer")),
        "ara": threshold(data.get("ara")),
        "arb": threshold(data.get("arb")),
        "source": "stockbit",
    }


def get_quote(symbol: str) -> dict[str, Any]:
    clean = symbol.upper().strip()
    cache_key = f"quote:{clean}"
    cached = QUOTE_CACHE.get(cache_key)
    if cached is not None:
        return cached

    payload = _request_json(
        f"/company-price-feed/v2/orderbook/companies/{clean}"
    )
    result = parse_quote(payload, clean)
    QUOTE_CACHE.set(cache_key, result, 3)
    return result


def get_chart(symbol: str, timeframe: str = "1Y") -> dict[str, Any]:
    clean = symbol.upper().strip()
    tf = timeframe.upper()
    if tf not in CHART_TIMEFRAMES:
        tf = "1Y"
    request_tf = CHART_TIMEFRAMES[tf]
    cache_key = f"chart:{clean}:{tf}"
    cached = CHART_CACHE.get(cache_key)
    if cached is not None:
        return cached

    payload = _request_json(
        f"/charts/{clean}/daily",
        {
            "timeframe": request_tf,
            "chart_type": "PRICE_CHART_TYPE_CANDLE",
        },
    )
    rows = (payload.get("data") or {}).get("prices") or []
    candles: list[dict[str, Any]] = []
    for row in rows:
        close = _number(row.get("value"))
        time_value = _chart_time(row)
        if close is None or time_value is None:
            continue
        open_price = _number(row.get("open"))
        high = _number(row.get("high"))
        low = _number(row.get("low"))
        volume_lots = _number(row.get("volume")) or 0.0
        candles.append(
            {
                "time": time_value,
                "date": datetime.fromtimestamp(time_value, tz=WIB).date().isoformat(),
                "open": open_price if open_price is not None else close,
                "high": high if high is not None else close,
                "low": low if low is not None else close,
                "close": close,
                "volume": int(round(volume_lots * 100)),
            }
        )

    candles.sort(key=lambda item: item["time"])
    deduped = list({item["time"]: item for item in candles}.values())
    deduped.sort(key=lambda item: item["time"])

    previous_close: float | None = None
    if deduped:
        latest_day = datetime.fromtimestamp(deduped[-1]["time"], tz=WIB).date()
        earlier = [
            item
            for item in deduped
            if datetime.fromtimestamp(item["time"], tz=WIB).date() < latest_day
        ]
        if earlier:
            previous_close = earlier[-1]["close"]
        elif len(deduped) > 1:
            previous_close = deduped[-2]["close"]

    if tf == "1D" and deduped:
        latest_day = datetime.fromtimestamp(deduped[-1]["time"], tz=WIB).date()
        deduped = [
            item
            for item in deduped
            if datetime.fromtimestamp(item["time"], tz=WIB).date() == latest_day
        ]

    result = {
        "symbol": clean,
        "timeframe": tf,
        "source": "stockbit",
        "candles": deduped,
        "last": deduped[-1] if deduped else None,
        "previous_close": previous_close,
        "limitations": (
            []
            if deduped
            else ["Stockbit tidak mengembalikan candle untuk timeframe ini."]
        ),
    }
    cache_ttl = {"1D": 4, "1W": 4, "1Y": 15, "5Y": 60}[tf]
    CHART_CACHE.set(cache_key, result, cache_ttl)
    return result
