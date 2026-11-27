import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from .errors import UpstreamError
from .stockbit import clear_session, login_with_raw, status


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Simpan sesi Stockbit dari cookie credentialStorage."
    )
    parser.add_argument(
        "--file",
        help="File berisi nilai cookie credentialStorage (default: stdin).",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Hapus sesi Stockbit yang tersimpan.",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Tampilkan status sesi tanpa mengubah apa pun.",
    )
    args = parser.parse_args()

    if args.clear:
        clear_session()
        print(json.dumps(asdict(status()), indent=2))
        return

    if args.status:
        print(json.dumps(asdict(status()), indent=2))
        return

    raw = (
        Path(args.file).read_text(encoding="utf-8")
        if args.file
        else sys.stdin.read()
    )
    try:
        result = login_with_raw(raw)
    except UpstreamError as exc:
        print(
            json.dumps(
                {"ok": False, "error": exc.message, "kind": exc.kind},
                indent=2,
            )
        )
        raise SystemExit(1)

    print(json.dumps({"ok": True, **asdict(result)}, indent=2))


if __name__ == "__main__":
    main()
