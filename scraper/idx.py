import json
import logging
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from scrapling.fetchers import Fetcher, StealthySession

from .cache import TTLCache
from .errors import UpstreamError

logger = logging.getLogger("telaah.idx")
logging.getLogger("scrapling").setLevel(logging.WARNING)

IDX_BASE = "https://www.idx.co.id"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Referer": "https://www.idx.co.id/",
    "Origin": "https://www.idx.co.id",
}

CACHE = TTLCache()
CACHE_TTL_SECONDS = int(os.getenv("IDX_CACHE_TTL_SECONDS", "900"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("IDX_REQUEST_TIMEOUT_SECONDS", "30"))
STEALTH_TIMEOUT_SECONDS = int(os.getenv("IDX_STEALTH_TIMEOUT_SECONDS", "90"))
STEALTH_ENABLED = os.getenv("IDX_STEALTH_ENABLED", "true").lower() != "false"
OWNERSHIP_TITLE = "KEPEMILIKAN"
STEALTH_LOCK = threading.Lock()


def _stealth_session():
    if not STEALTH_ENABLED:
        raise UpstreamError(
            "IDX memblokir request dan stealth browser dimatikan.",
            kind="blocked",
        )
    return StealthySession(
        headless=True,
        solve_cloudflare=True,
        timeout=STEALTH_TIMEOUT_SECONDS,
    )


def _fetch_with_stealth(url: str):
    """Last-resort browser fetch for a Cloudflare challenge.

    One browser at a time: a cold scan can otherwise launch several Chromium
    instances in parallel and exhaust the container.
    """
    with STEALTH_LOCK:
        try:
            with _stealth_session() as session:
                page = session.fetch(url)
        except UpstreamError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(
                f"Stealth browser gagal: {exc}", kind="blocked"
            ) from exc

    if page.status != 200:
        kind = "blocked" if page.status == 403 else "provider"
        raise UpstreamError(
            f"IDX stealth membalas HTTP {page.status}.", kind=kind
        )
    return page


def _fetch_pdf_with_stealth(url: str) -> bytes:
    """Capture the raw PDF from the browser's PDF viewer.

    Navigating to an IDX PDF returns Chrome's viewer HTML, not the document.
    Listen for the application/pdf network response and return its bytes.
    """
    captured: list[bytes] = []

    with STEALTH_LOCK:
        try:
            with _stealth_session() as session:
                page = session.context.new_page()

                def on_response(response) -> None:
                    try:
                        content_type = response.headers.get("content-type", "")
                        if "application/pdf" not in content_type.lower():
                            return
                        body = response.body()
                        if body.startswith(b"%PDF"):
                            captured.append(body)
                    except Exception:  # noqa: BLE001
                        return

                page.on("response", on_response)
                try:
                    page.goto(url, wait_until="networkidle", timeout=12_000)
                except Exception:  # noqa: BLE001 - the viewer can stay busy
                    pass

                deadline = time.time() + 4
                while not captured and time.time() < deadline:
                    time.sleep(0.5)

                page.close()
        except UpstreamError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamError(
                f"Stealth PDF browser gagal: {exc}", kind="blocked"
            ) from exc

    if not captured:
        raise UpstreamError("IDX tidak mengembalikan PDF yang valid.", kind="blocked")
    return captured[0]


def _date_only(value: Any) -> str | None:
    if not value:
        return None
    text = str(value)
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        return text[:10]
    return None


def _parse_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = re.sub(r"[^0-9.,-]", "", str(value))
    if not text:
        return None
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    else:
        parts = text.split(".")
        if len(parts) > 1 and len(parts[-1]) == 3:
            text = text.replace(".", "")
    try:
        return float(text)
    except ValueError:
        return None


def fetch_json(url: str, cache_key: str | None = None) -> dict[str, Any]:
    if cache_key:
        cached = CACHE.get(cache_key)
        if cached is not None:
            return cached

    page = None
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            page = Fetcher.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT_SECONDS)
        except Exception as exc:  # noqa: BLE001 - upstream exception types vary
            last_error = exc
            time.sleep(0.8 * (attempt + 1))
            continue

        if page.status == 200:
            break
        if page.status == 403:
            break
        if page.status in (429, 500, 502, 503, 504) and attempt < 2:
            time.sleep(0.8 * (attempt + 1))
            continue
        break

    if page is None:
        raise UpstreamError(
            f"IDX request gagal: {last_error or 'unknown'}", kind="network"
        )

    if page.status != 200:
        if page.status in (403, 429, 500, 502, 503, 504):
            page = _fetch_with_stealth(url)
        else:
            raise UpstreamError(f"IDX membalas HTTP {page.status}.", kind="provider")
    if page.status != 200:
        raise UpstreamError(f"IDX membalas HTTP {page.status}.", kind="provider")

    body = bytes(page.body or b"")
    if body.lstrip().startswith(b"<"):
        page = _fetch_with_stealth(url)
        body = bytes(page.body or b"")

    try:
        payload = json.loads(body)
    except Exception as exc:  # noqa: BLE001
        raise UpstreamError("IDX mengembalikan JSON tidak valid.", kind="provider") from exc

    if cache_key:
        CACHE.set(cache_key, payload, CACHE_TTL_SECONDS)
    return payload


def fetch_bytes(url: str, cache_key: str | None = None) -> bytes:
    if cache_key:
        cached = CACHE.get(cache_key)
        if cached is not None:
            return cached

    try:
        page = Fetcher.get(
            url,
            headers={
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://www.idx.co.id/",
                "Accept": "application/pdf,*/*",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except Exception:  # noqa: BLE001
        page = _fetch_with_stealth(url)

    if page.status != 200:
        page = _fetch_with_stealth(url)
    if page.status != 200:
        raise UpstreamError(
            f"IDX PDF membalas HTTP {page.status}.", kind="provider"
        )

    body = bytes(page.body or b"")
    # Cloudflare can return its HTML challenge with a 200 status. A real PDF
    # starts with %PDF; otherwise capture it from the browser's PDF viewer.
    if not body.startswith(b"%PDF"):
        body = _fetch_pdf_with_stealth(url)

    if cache_key:
        CACHE.set(cache_key, body, CACHE_TTL_SECONDS)
    return body


def normalize_foreign_flow(payload: dict[str, Any], symbol: str) -> dict[str, Any]:
    rows = payload.get("replies") or []
    data: list[dict[str, Any]] = []
    for row in rows:
        date = _date_only(row.get("Date"))
        foreign_buy = _parse_number(row.get("ForeignBuy")) or 0.0
        foreign_sell = _parse_number(row.get("ForeignSell")) or 0.0
        close = _parse_number(row.get("Close"))
        net_shares = foreign_buy - foreign_sell
        data.append(
            {
                "date": date,
                "net_foreign_shares": net_shares,
                "net_foreign_inflow": net_shares * close if close is not None else 0.0,
                "close": close,
            }
        )
    data = [row for row in data if row["date"]]
    data.sort(key=lambda row: row["date"] or "")
    return {
        "symbol": symbol.upper(),
        "start": data[0]["date"] if data else None,
        "end": data[-1]["date"] if data else None,
        "data": data,
        "source": "idx",
    }


def get_foreign_flow(symbol: str, length: int = 90) -> dict[str, Any]:
    clean = symbol.upper().strip()
    length = max(1, min(length, 180))
    url = (
        f"{IDX_BASE}/primary/ListedCompany/GetTradingInfoSS"
        f"?code={clean}&start=0&length={length}"
    )
    try:
        payload = fetch_json(url, cache_key=f"foreign:{clean}:{length}")
    except UpstreamError:
        # IDX occasionally 502s on a large page. Fetch it in 30-row slices and
        # keep whatever succeeds instead of losing all foreign flow.
        if length <= 30:
            raise
        replies: list[dict[str, Any]] = []
        for start in range(0, length, 30):
            chunk_length = min(30, length - start)
            chunk_url = (
                f"{IDX_BASE}/primary/ListedCompany/GetTradingInfoSS"
                f"?code={clean}&start={start}&length={chunk_length}"
            )
            try:
                chunk = fetch_json(
                    chunk_url,
                    cache_key=f"foreign:{clean}:{start}:{chunk_length}",
                )
            except UpstreamError:
                continue
            replies.extend(chunk.get("replies") or [])
        if not replies:
            raise
        payload = {"replies": replies}

    # De-duplicate overlapping chunks by ID, then by date.
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for row in payload.get("replies") or []:
        key = str(row.get("IDStockSummary") or row.get("Date") or "")
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        unique.append(row)
    return normalize_foreign_flow({"replies": unique}, clean)


def normalize_profile(payload: dict[str, Any], symbol: str) -> dict[str, Any] | None:
    profiles = payload.get("Profiles") or []
    if not profiles:
        return None
    profile = profiles[0]

    directors = []
    for item in payload.get("Direktur") or []:
        directors.append(
            {
                "name": (item.get("Nama") or "").strip(),
                "title": (item.get("Jabatan") or "Direksi").strip(),
            }
        )
    commissioners = []
    for item in payload.get("Komisaris") or []:
        commissioners.append(
            {
                "name": (item.get("Nama") or "").strip(),
                "title": (item.get("Jabatan") or "Komisaris").strip(),
            }
        )
    shareholders = []
    for item in payload.get("PemegangSaham") or []:
        percentage = _parse_number(item.get("Persentase"))
        if percentage is None:
            continue
        shareholders.append(
            {
                "name": (item.get("Nama") or "").strip(),
                "percentage": percentage,
                "total_shares": _parse_number(item.get("Jumlah")),
                "category": item.get("Kategori"),
                "controlling": bool(item.get("Pengendali")),
            }
        )

    return {
        "symbol": symbol.upper(),
        "company_name": (profile.get("NamaEmiten") or "").strip(),
        "overview": {
            "company_name": (profile.get("NamaEmiten") or "").strip(),
            "sector": (profile.get("Sektor") or "").strip() or None,
            "sub_sector": (profile.get("SubSektor") or "").strip() or None,
            "industry": (profile.get("Industri") or "").strip() or None,
            "sub_industry": (profile.get("SubIndustri") or "").strip() or None,
            "address": (profile.get("Alamat") or "").strip() or None,
            "website": (profile.get("Website") or "").strip() or None,
            "description": (profile.get("KegiatanUsahaUtama") or "").strip() or None,
            "listing_board": (profile.get("PapanPencatatan") or "").strip() or None,
            "ipo_date": _date_only(profile.get("TanggalPencatatan")),
        },
        "management": {
            "key_executives": directors + commissioners,
        },
        "ownership": {
            "major_shareholders": shareholders,
        },
        "source": "idx",
    }


def get_profile(symbol: str) -> dict[str, Any] | None:
    clean = symbol.upper().strip()
    url = (
        f"{IDX_BASE}/primary/ListedCompany/GetCompanyProfilesDetail"
        f"?KodeEmiten={clean}&language=id-id"
    )
    payload = fetch_json(url, cache_key=f"profile:{clean}")
    return normalize_profile(payload, clean)


def normalize_announcements(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = payload.get("Replies") or []
    results = []
    for row in rows:
        announcement = row.get("pengumuman") or {}
        attachments = row.get("attachments") or []
        pdfs = [
            item
            for item in attachments
            if item.get("FullSavePath")
        ]
        results.append(
            {
                "id": announcement.get("Id2")
                or announcement.get("NoPengumuman")
                or announcement.get("Id"),
                "date": _date_only(announcement.get("TglPengumuman")),
                "title": (announcement.get("JudulPengumuman") or "").strip(),
                "body": (announcement.get("PerihalPengumuman") or "").strip(),
                "symbol": (announcement.get("Kode_Emiten") or "").strip(),
                "category": announcement.get("JenisPengumuman"),
                "attachment_url": pdfs[0].get("FullSavePath") if pdfs else None,
                "attachments": [
                    {
                        "url": item.get("FullSavePath"),
                        "filename": item.get("OriginalFilename"),
                    }
                    for item in pdfs
                ],
            }
        )
    return results


def get_announcements(
    symbol: str | None = None,
    *,
    page_size: int = 1000,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, Any]]:
    clean = (symbol or "").upper().strip()
    today = datetime.now(timezone.utc)
    date_from = date_from or (today - timedelta(days=365)).strftime("%Y%m%d")
    date_to = date_to or today.strftime("%Y%m%d")
    page_size = max(1, min(page_size, 1000))
    cache_key = f"ann:{clean or 'ALL'}:{page_size}:{date_from}:{date_to}"
    url = (
        f"{IDX_BASE}/primary/ListedCompany/GetAnnouncement"
        f"?kodeEmiten={clean}&indexFrom=0&pageSize={page_size}"
        f"&dateFrom={date_from}&dateTo={date_to}&lang=id"
    )
    payload = fetch_json(url, cache_key=cache_key)
    return normalize_announcements(payload)


def normalize_suspensions(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = []
    for row in payload.get("Results") or []:
        results.append(
            {
                "title": (row.get("Judul") or "").strip(),
                "symbol": (row.get("Kode") or "").strip(),
                "date": _date_only(row.get("Date")),
                "raw": row,
            }
        )
    return results


def get_suspensions(limit: int = 100) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 500))
    url = f"{IDX_BASE}/primary/Home/GetSuspendData?resultCount={limit}"
    payload = fetch_json(url, cache_key=f"suspensions:{limit}")
    return normalize_suspensions(payload)


def normalize_calendar(payload: dict[str, Any]) -> list[dict[str, Any]]:
    results = []
    for row in payload.get("Results") or []:
        results.append(
            {
                "id": row.get("id"),
                "title": (row.get("title") or "").strip(),
                "description": (row.get("description") or "").strip(),
                "date": _date_only(row.get("start")),
                "type": (row.get("Jenis") or "").strip(),
                "step": (row.get("Step") or "").strip(),
                "location": (row.get("location") or "").strip(),
                "raw": row,
            }
        )
    return results


def get_calendar(month: str | None = None) -> list[dict[str, Any]]:
    date = month or datetime.now(timezone.utc).strftime("%Y%m%d")
    if re.fullmatch(r"\d{4}-\d{2}", date):
        date = f"{date.replace('-', '')}01"
    url = f"{IDX_BASE}/primary/Home/GetCalendar?range=m&date={date}"
    payload = fetch_json(url, cache_key=f"calendar:{date}")
    return normalize_calendar(payload)


def _pdf_text(url: str) -> str:
    import io

    from pypdf import PdfReader

    body = fetch_bytes(url, cache_key=f"pdf:{url}")
    reader = PdfReader(io.BytesIO(body))
    pages = []
    for page in reader.pages[:10]:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)[:20_000]


def _is_ownership_report(title: str) -> bool:
    upper = (title or "").upper()
    return OWNERSHIP_TITLE in upper or "TRANSAKSI SAHAM" in upper


def _fallback_filing(announcement: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": announcement.get("id"),
        "date": announcement.get("date"),
        "title": announcement.get("title") or "Laporan kepemilikan",
        "body": announcement.get("body") or "",
        "symbol": (announcement.get("symbol") or "").upper(),
        "category": "insider",
        "holder_name": "Tidak dapat diparse",
        "holder_type": "insider",
        "transaction_type": "neutral",
        "amount_transaction": None,
        "price": None,
        "transaction_value": None,
        "attachment_url": announcement.get("attachment_url"),
        "source": "idx-announcement-pdf",
        "unparsed": True,
    }


def _parse_announcement(announcement: dict[str, Any]) -> dict[str, Any]:
    from .insider_parser import parse_ownership_text

    url = announcement.get("attachment_url")
    if not url:
        return _fallback_filing(announcement)
    try:
        text = _pdf_text(url)
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF parse failed for %s: %s", url, exc)
        return _fallback_filing(announcement)
    if not text.strip():
        return _fallback_filing(announcement)

    return parse_ownership_text(
        text,
        symbol=(announcement.get("symbol") or "").upper(),
        title=announcement.get("title") or "Laporan kepemilikan",
        announcement_date=announcement.get("date"),
        filing_id=announcement.get("id"),
        attachment_url=url,
    )


def get_insider_filings(
    symbol: str, days: int = 365, limit: int = 20
) -> list[dict[str, Any]]:
    clean = symbol.upper().strip()
    days = max(1, min(days, 730))
    limit = max(1, min(limit, 50))
    today = datetime.now(timezone.utc)
    date_from = (today - timedelta(days=days)).strftime("%Y%m%d")
    date_to = today.strftime("%Y%m%d")
    cache_key = f"insider:{clean}:{days}:{limit}"
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached

    announcements = [
        item
        for item in get_announcements(
            clean, page_size=1000, date_from=date_from, date_to=date_to
        )
        if _is_ownership_report(item.get("title") or "")
    ]
    results = [_parse_announcement(item) for item in announcements[:limit]]
    CACHE.set(cache_key, results, CACHE_TTL_SECONDS)
    return results


def get_insider_feed(days: int = 30, limit: int = 25) -> dict[str, Any]:
    days = max(1, min(days, 180))
    limit = max(1, min(limit, 50))
    today = datetime.now(timezone.utc)
    date_from = (today - timedelta(days=days)).strftime("%Y%m%d")
    date_to = today.strftime("%Y%m%d")
    cache_key = f"insider-feed:{days}:{limit}"
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached

    announcements = [
        item
        for item in get_announcements(
            None, page_size=1000, date_from=date_from, date_to=date_to
        )
        if _is_ownership_report(item.get("title") or "")
        and len((item.get("symbol") or "").strip()) == 4
    ]
    announcements.sort(key=lambda item: item.get("date") or "", reverse=True)

    seen: set[str] = set()
    results = []
    for item in announcements:
        url = item.get("attachment_url")
        if not url or url in seen:
            continue
        seen.add(url)
        results.append(_parse_announcement(item))
        if len(results) >= limit:
            break

    response = {
        "results": results,
        "source": "idx",
        "stale": False,
        "limitations": (
            []
            if results
            else ["Tidak ada laporan kepemilikan baru pada periode ini."]
        ),
    }
    CACHE.set(cache_key, response, CACHE_TTL_SECONDS)
    return response
