"""Plugin management routes for AnyWorker."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

from anyworker.server.manager import SessionManager

from .deps import error_response

log = logging.getLogger(__name__)


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/plugins", tags=["plugins"])

    @router.post("/install")
    async def install_plugin(body: dict[str, Any]) -> Any:
        from anyworker.plugins.registry import PluginRegistry, PluginError

        url = body.get("url", "")
        name = body.get("name") or ""
        if not url:
            return error_response(ValueError("url is required"))
        try:
            reg = PluginRegistry()
            manifest = reg.install_plugin(url, name or None)
            return manifest.to_dict()
        except PluginError as exc:
            return error_response(exc)

    @router.get("/")
    async def list_plugins() -> Any:
        from anyworker.plugins.registry import PluginRegistry

        reg = PluginRegistry()
        plugins = reg.list_plugins()
        return {"plugins": [p.to_dict() for p in plugins]}

    @router.delete("/{name}")
    async def uninstall_plugin(name: str) -> Any:
        from anyworker.plugins.registry import PluginRegistry

        reg = PluginRegistry()
        ok = reg.uninstall_plugin(name)
        return {"ok": ok}

    @router.get("/{name}/skills")
    async def plugin_skills(name: str) -> Any:
        from anyworker.plugins.registry import PluginRegistry

        reg = PluginRegistry()
        plugin = reg.get_plugin(name)
        if plugin is None:
            return error_response(ValueError(f"plugin {name!r} not found"))
        return {"skills": plugin.skills, "name": plugin.name, "version": plugin.version}

    return router
