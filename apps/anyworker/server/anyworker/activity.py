"""Activity log — an append-only trace of what the agent did.

One JSONL file per session under `config.state_dir()/activity/`. Records reuse
the `EventType` vocabulary from `agent/events.py`. Arguments and results are
truncated and secret-shaped values are redacted, so the log never carries API
keys or whole files.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Optional

from anyworker.agent.events import EventType
from anyworker.config import state_dir

log = logging.getLogger(__name__)

#: Rotate once a session log passes this size. One old generation is kept.
MAX_BYTES = 2 * 1024 * 1024

#: Longest string value written for any field.
MAX_VALUE_CHARS = 500

#: Values under these keys are never written.
SECRET_KEYS = frozenset(
    {"api_key", "apikey", "key", "token", "secret", "password", "authorization"}
)

REDACTED = "[redacted]"


def _redact(value: Any, depth: int = 0) -> Any:
    if depth > 4:
        return REDACTED
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if str(k).lower() in SECRET_KEYS:
                out[str(k)] = REDACTED
            else:
                out[str(k)] = _redact(v, depth + 1)
        return out
    if isinstance(value, list):
        return [_redact(v, depth + 1) for v in value[:20]]
    if isinstance(value, str):
        if len(value) > MAX_VALUE_CHARS:
            return value[:MAX_VALUE_CHARS] + "…"
        return value
    return value


class ActivityLog:
    def __init__(
        self, directory: Optional[Path] = None, max_bytes: int = MAX_BYTES
    ) -> None:
        self.directory = directory or (state_dir() / "activity")
        self.max_bytes = max_bytes

    def path_for(self, session_id: str) -> Path:
        return self.directory / f"{session_id}.jsonl"

    def append(
        self, session_id: str, event_type: EventType, payload: dict[str, Any]
    ) -> None:
        record = {
            "ts": time.time(),
            "session_id": session_id,
            "type": event_type.value,
            "payload": _redact(payload or {}),
        }
        path = self.path_for(session_id)
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            self._rotate_if_needed(path)
            with path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(record) + "\n")
        except OSError:
            log.exception("Failed to append activity for %s", session_id)

    def _rotate_if_needed(self, path: Path) -> None:
        try:
            if path.stat().st_size < self.max_bytes:
                return
        except OSError:
            return
        os.replace(path, path.with_suffix(".jsonl.1"))

    def read(
        self, session_id: str, limit: int = 100, before: Optional[float] = None
    ) -> list[dict[str, Any]]:
        """Records for one session, newest first.

        `before` is a `ts` cursor: only strictly older records come back.
        """
        records: list[dict[str, Any]] = []
        for candidate in (
            self.path_for(session_id).with_suffix(".jsonl.1"),
            self.path_for(session_id),
        ):
            if not candidate.exists():
                continue
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except ValueError:
                    continue
        if before is not None:
            records = [r for r in records if r.get("ts", 0.0) < before]
        records.reverse()
        return records[: max(0, limit)]
