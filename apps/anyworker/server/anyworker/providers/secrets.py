"""Local secret + settings store (JSON under app data dir)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from anyworker.config import state_dir

#: Anthropic-native root. The SDK appends `/v1/messages`, so this must NOT
#: already carry `/v1`.
ANYROUTER_BASE_URL = "https://anyrouter.dev/api"


class SecretStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or (state_dir() / "settings.json")
        self._data: dict[str, Any] = {"providers": {}, "active": {}, "account": {}}
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                self._data = {"providers": {}, "active": {}, "account": {}}
            else:
                # Tighten permissions on files written by older builds.
                try:
                    os.chmod(self.path, 0o600)
                except OSError:
                    pass

    def save(self) -> None:
        """Write the store owner-readable only, with no world-readable window."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(self._data, indent=2, sort_keys=True)
        fd = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            os.write(fd, payload.encode("utf-8"))
        finally:
            os.close(fd)
        # O_CREAT honours the mode only for new files; fix up existing ones.
        os.chmod(self.path, 0o600)

    def get_provider_profile(self, name: str) -> dict[str, Any]:
        return dict(self._data.get("providers", {}).get(name) or {})

    def set_provider_profile(self, name: str, profile: dict[str, Any]) -> None:
        providers = self._data.setdefault("providers", {})
        providers[name] = profile
        self.save()

    def get_active(self) -> dict[str, Any]:
        return dict(self._data.get("active") or {})

    def set_active(
        self, *, provider: str, model: str, workspace: Optional[str] = None
    ) -> None:
        active = self._data.setdefault("active", {})
        active["provider"] = provider
        active["model"] = model
        if workspace is not None:
            active["workspace"] = workspace
        self.save()

    # -- AnyRouter account -------------------------------------------------

    def get_account(self) -> dict[str, Any]:
        """The signed-in AnyRouter account, or `{}` when signed out."""
        return dict(self._data.get("account") or {})

    def set_account(
        self,
        *,
        user_id: str,
        api_key: str,
        management_key: str = "",
        scopes: Optional[list[str]] = None,
        signed_in_at: float,
    ) -> None:
        self._data["account"] = {
            "user_id": user_id,
            "api_key": api_key,
            "management_key": management_key,
            "scopes": list(scopes or []),
            "signed_in_at": signed_in_at,
        }
        self.save()

    def clear_account(self) -> None:
        self._data["account"] = {}
        self.save()

    def resolve_api_key(self, provider_name: str, env_key: Optional[str]) -> str:
        if provider_name == "anyrouter":
            account_key = (self.get_account().get("api_key") or "").strip()
            if account_key:
                return account_key
        profile = self.get_provider_profile(provider_name)
        key = (profile.get("api_key") or "").strip()
        if key:
            return key
        if env_key:
            return (os.environ.get(env_key) or "").strip()
        return ""

    def cas_env(self, provider_name: str) -> dict[str, str]:
        """Env vars for Claude Agent SDK / Anthropic-compatible gateways."""
        from .registry import get_provider

        desc = get_provider(provider_name)
        profile = self.get_provider_profile(provider_name)
        env: dict[str, str] = {}
        key = self.resolve_api_key(
            provider_name, desc.env_key if desc else "ANTHROPIC_API_KEY"
        )
        if key:
            env["ANTHROPIC_API_KEY"] = key
        base = (profile.get("base_url") or "").strip()
        if not base and desc and desc.default_base_url:
            base = desc.default_base_url
        if provider_name == "anyrouter":
            # Ignore a stale `/api/v1` base saved by an earlier build — the
            # Anthropic-native path is rooted at `/api`.
            base = ANYROUTER_BASE_URL
        if base and provider_name != "anthropic":
            # Gateways (AnyRouter etc.) that speak Anthropic Messages / Claude Code API.
            env["ANTHROPIC_BASE_URL"] = base.rstrip("/")
        if provider_name == "anyrouter":
            # The Claude Code CLI the Agent SDK spawns reads this env var, so
            # inference traffic carries the same attribution as the API client.
            env["ANTHROPIC_CUSTOM_HEADERS"] = (
                "X-AnyRouter-Title: AnyWorker\nX-AnyRouter-Source: anyworker"
            )
        return env
