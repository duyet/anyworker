"""CLI entry: anyworker-server."""

from __future__ import annotations

import argparse
import logging

import uvicorn

from anyworker.config import default_host, default_port
from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


def main() -> None:
    parser = argparse.ArgumentParser(prog="anyworker-server")
    parser.add_argument("--host", default=default_host())
    parser.add_argument("--port", type=int, default=default_port())
    parser.add_argument(
        "--cwd",
        default=None,
        help="Optional default workspace path",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    manager = SessionManager()
    if args.cwd:
        active = manager.secrets.get_active()
        manager.secrets.set_active(
            provider=active.get("provider") or "anthropic",
            model=active.get("model") or "",
            workspace=args.cwd,
        )

    app = create_app(manager)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
