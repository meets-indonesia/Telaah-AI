import threading
import time
from typing import Any


class TTLCache:
    def __init__(self) -> None:
        self._items: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._items.get(key)
            if not item:
                return None
            expires_at, value = item
            if expires_at < time.time():
                self._items.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int) -> Any:
        with self._lock:
            self._items[key] = (time.time() + ttl_seconds, value)
        return value

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
