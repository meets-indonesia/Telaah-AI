import re
from datetime import datetime
from typing import Any

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "mei": 5,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "agu": 8,
    "aug": 8,
    "sep": 9,
    "okt": 10,
    "oct": 10,
    "nov": 11,
    "des": 12,
    "dec": 12,
}


def parse_number(value: Any) -> float | None:
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


def parse_percentage(value: Any) -> float | None:
    return parse_number(value)


def parse_transaction_date(text: str) -> str | None:
    match = re.search(
        r"(\d{1,2})\s*-\s*([A-Za-z]{3,})\s*-\s*(\d{4})", text
    )
    if not match:
        return None
    day, month_name, year = match.groups()
    month = MONTHS.get(month_name[:3].lower())
    if not month:
        return None
    try:
        return datetime(int(year), month, int(day)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def detect_transaction_type(text: str) -> str:
    lower = text.lower()
    if "pembelian" in lower or "membeli" in lower or "purchase" in lower:
        return "buy"
    if (
        "penjualan" in lower
        or "menjual" in lower
        or "pelepasan" in lower
        or "sale" in lower
        or "sell" in lower
    ):
        return "sell"
    if "hibah" in lower or "transfer" in lower or "pengalihan" in lower:
        return "transfer"
    return "neutral"


def _first_field(text: str, labels: list[str]) -> str | None:
    for label in labels:
        match = re.search(
            rf"{re.escape(label)}\s*:\s*([^\n\r]+)", text, re.IGNORECASE
        )
        if match:
            value = match.group(1).strip()
            if value and not value.lower().startswith("tidak ditampilkan"):
                return value
    return None


def _table_row(text: str) -> dict[str, Any]:
    # IDX PDFs often split the table header across lines:
    # "379.428,00 Saham \nBiasa 6.982,00". Match across whitespace first.
    pattern = re.compile(
        r"([\d.]+,\d{2})\s+(?:Saham\s+Biasa|Common\s+Stock)\s+([\d.]+,\d{2})",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if match:
        window = text[max(0, match.start() - 250) : match.end() + 250]
        return {
            "line": window,
            "shares": parse_number(match.group(1)),
            "price": parse_number(match.group(2)),
            "date": parse_transaction_date(window),
            "transaction_type": detect_transaction_type(window),
        }

    for line in text.splitlines():
        if "Saham Biasa" not in line and "Common Stock" not in line:
            continue
        shares_match = re.search(
            r"([\d.]+,\d{2})\s+(?:Saham Biasa|Common Stock)", line
        )
        price_match = re.search(
            r"(?:Saham Biasa|Common Stock)\s+([\d.]+,\d{2})", line
        )
        if not shares_match:
            continue
        return {
            "line": line,
            "shares": parse_number(shares_match.group(1)),
            "price": parse_number(price_match.group(1)) if price_match else None,
            "date": parse_transaction_date(line),
            "transaction_type": detect_transaction_type(line),
        }
    return {}


def parse_ownership_text(
    text: str,
    *,
    symbol: str,
    title: str,
    announcement_date: str | None,
    filing_id: str | None,
    attachment_url: str | None,
) -> dict[str, Any]:
    compact = re.sub(r"[ \t]+", " ", text)

    holder_name = _first_field(
        compact, ["Nama (sesuai SID)", "Name (SID)", "Nama Pemilik"]
    )
    position = _first_field(compact, ["Jabatan", "Position"])
    before = parse_number(
        _first_field(
            compact,
            [
                "Jumlah Saham Sebelum Transaksi",
                "Number of shares owned before the transaction",
            ],
        )
    )
    after = parse_number(
        _first_field(
            compact,
            [
                "Jumlah Saham Setelah Transaksi",
                "Number of shares owned after the transaction",
            ],
        )
    )
    pct_before = parse_percentage(
        _first_field(
            compact,
            ["Hak Suara Sebelum Transaksi", "Voting rights before the transaction"],
        )
    )
    pct_after = parse_percentage(
        _first_field(
            compact,
            ["Hak Suara Setelah Transaksi", "Voting rights after the transaction"],
        )
    )
    company = _first_field(
        compact, ["Nama Perusahaan Tbk", "Issuer"]
    )

    row = _table_row(compact)
    transaction_type = row.get("transaction_type") or detect_transaction_type(compact)
    if transaction_type == "neutral" and before is not None and after is not None:
        if after > before:
            transaction_type = "buy"
        elif after < before:
            transaction_type = "sell"

    shares = row.get("shares")
    if shares is None and before is not None and after is not None:
        shares = abs(after - before)
    price = row.get("price")
    transaction_value = shares * price if shares is not None and price is not None else None

    is_board_member = bool(
        re.search(
            r"(?:Anggota Direksi/Dewan Komisaris|Board of Director[^\n]*)\s*:\s*(?:Ya|Yes)",
            compact,
            re.IGNORECASE,
        )
    )
    holder_type = "insider" if (is_board_member or position) else "major_holder"

    parsed = {
        "id": filing_id,
        "date": row.get("date") or announcement_date,
        "title": title,
        "body": (company or "") + " " + title,
        "symbol": symbol.upper(),
        "category": "insider" if holder_type == "insider" else "major_holder",
        "holder_name": holder_name or "Pemegang Saham",
        "holder_type": holder_type,
        "transaction_type": transaction_type,
        "amount_transaction": shares,
        "price": price,
        "transaction_value": transaction_value,
        "share_percentage_before": pct_before,
        "share_percentage_after": pct_after,
        "attachment_url": attachment_url,
        "source": "idx-announcement-pdf",
        "unparsed": shares is None,
    }
    return parsed
