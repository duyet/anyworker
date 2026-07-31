"""Durable permission policy — what a workspace is allowed to run.

Approval outcomes are `once | always_tool | deny`. Only `always_tool` is
durable: it is recorded here, keyed by `(workspace, tool_name)`, and survives
turns and app restarts. Stored as JSON under `config.state_dir()`, owner-only
like `SecretStore`.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Optional

from anyworker.config import state_dir

log = logging.getLogger(__name__)


class PermissionPolicy:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or (state_dir() / "permissions.json")
        self._data: dict[str, Any] = {"workspaces": {}}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            self._data = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            log.exception("Failed to load permission policy")
            self._data = {"workspaces": {}}
        else:
            # Tighten permissions on files written by older builds.
            try:
                os.chmod(self.path, 0o600)
            except OSError:
                pass
        self._data.setdefault("workspaces", {})

    def save(self) -> None:
        """Write the policy owner-readable only, with no world-readable window."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(self._data, indent=2, sort_keys=True)
        fd = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            os.write(fd, payload.encode("utf-8"))
        finally:
            os.close(fd)
        # O_CREAT honours the mode only for new files; fix up existing ones.
        os.chmod(self.path, 0o600)

    def _key(self, workspace: str) -> str:
        return str(Path(workspace).expanduser()) if workspace else ""

    def _rules(self, workspace: str) -> dict[str, Any]:
        return dict(self._data.get("workspaces", {}).get(self._key(workspace)) or {})

    # -- queries -----------------------------------------------------------

    def is_allowed(self, workspace: str, tool_name: str) -> bool:
        rule = self._rules(workspace).get(tool_name)
        return bool(rule) and rule.get("decision") == "allow"

    def list_rules(self, workspace: str) -> list[dict[str, Any]]:
        """Rules in force for one workspace, newest decision first."""
        rules = [
            {
                "tool": tool,
                "decision": rule.get("decision") or "allow",
                "decided_at": rule.get("decided_at") or 0.0,
            }
            for tool, rule in self._rules(workspace).items()
        ]
        rules.sort(key=lambda r: r["decided_at"], reverse=True)
        return rules

    # -- mutations ---------------------------------------------------------

    def allow(self, workspace: str, tool_name: str) -> None:
        workspaces = self._data.setdefault("workspaces", {})
        rules = workspaces.setdefault(self._key(workspace), {})
        rules[tool_name] = {"decision": "allow", "decided_at": time.time()}
        self.save()

    def record_outcome(self, workspace: str, tool_name: str, outcome: str) -> None:
        """Persist an approval outcome. Only `always_tool` is durable."""
        if outcome == "always_tool":
            self.allow(workspace, tool_name)

    def revoke(self, workspace: str, tool_name: str) -> bool:
        rules = self._data.get("workspaces", {}).get(self._key(workspace))
        if not rules or tool_name not in rules:
            return False
        rules.pop(tool_name)
        self.save()
        return True
