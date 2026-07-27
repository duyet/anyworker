"""Local secret + settings store (JSON under app data dir)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from anyworker.config import state_dir


class SecretStore:
    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or (state_dir() / "settings.json")
        self._data: dict[str, Any] = {"providers": {}, "active": {}}
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text(encoding="utf-8"))
            except Exception:
                self._data = {"providers": {}, "active": {}}

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self._data, indent=2, sort_keys=True), encoding="utf-8"
        )

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

    def resolve_api_key(self, provider_name: str, env_key: Optional[str]) -> str:
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
        if base and provider_name != "anthropic":
            # Gateways (AnyRouter etc.) that speak Anthropic Messages / Claude Code API.
            env["ANTHROPIC_BASE_URL"] = base.rstrip("/")
        return env
