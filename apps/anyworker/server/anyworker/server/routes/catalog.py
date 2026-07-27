"""Model catalog and presets, read from AnyRouter."""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter

from anyworker.anyrouter import AnyRouterError
from anyworker.server.manager import SessionManager

from . import deps
from .deps import error_response

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300

#: Offered first in the picker. Both work with no BYOK keys at all.
RECOMMENDED_MODEL_IDS = ("anyrouter/cowork", "anyrouter/free")


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["catalog"])
    cache: dict[str, tuple[float, Any]] = {}

    async def _cached(key: str, call: Any) -> Any:
        hit = cache.get(key)
        if hit and time.monotonic() - hit[0] < CACHE_TTL_SECONDS:
            return hit[1]
        value = await call()
        cache[key] = (time.monotonic(), value)
        return value

    @router.get("/models")
    async def models() -> Any:
        client = deps.client_for(manager)
        try:
            catalog = await _cached("models", client.models)
        except AnyRouterError as exc:
            return error_response(exc)

        data = catalog.get("data") if isinstance(catalog, dict) else None
        models_list = list(data or [])
        by_id = {m.get("id"): m for m in models_list if isinstance(m, dict)}

        # Top models are a nice-to-have ranking — never fail the catalog on them.
        top: list[dict[str, Any]] = []
        try:
            ranked = await _cached("top_models", client.top_models)
            raw = ranked.get("data") if isinstance(ranked, dict) else ranked
            for item in list(raw or []):
                if not isinstance(item, dict):
                    continue
                model_id = item.get("model") or item.get("id")
                top.append(
                    {
                        "id": model_id,
                        "requests": item.get("requests") or item.get("count"),
                        "model": by_id.get(model_id),
                    }
                )
        except AnyRouterError as exc:
            log.info("top-models unavailable: %s", exc)

        return {
            "recommended": [
                by_id[mid] for mid in RECOMMENDED_MODEL_IDS if mid in by_id
            ],
            "recommended_ids": list(RECOMMENDED_MODEL_IDS),
            "top": top,
            "models": models_list,
        }

    @router.get("/presets")
    async def presets() -> Any:
        try:
            return await deps.client_for(manager).presets()
        except AnyRouterError as exc:
            return error_response(exc)

    return router
