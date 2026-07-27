"""App paths and defaults."""

from __future__ import annotations

import os
from pathlib import Path

from platformdirs import user_data_dir

APP_NAME = "AnyWorker"
APP_AUTHOR = "anyworker"


def state_dir() -> Path:
    """Durable app data: sessions index, secrets, settings."""
    override = os.environ.get("ANYWORKER_STATE_DIR")
    if override:
        path = Path(override).expanduser()
    else:
        path = Path(user_data_dir(APP_NAME, APP_AUTHOR))
    path.mkdir(parents=True, exist_ok=True)
    return path


def default_port() -> int:
    return int(os.environ.get("ANYWORKER_PORT", "8765"))


def default_host() -> str:
    # Loopback only — local desktop sidecar.
    return os.environ.get("ANYWORKER_HOST", "127.0.0.1")
