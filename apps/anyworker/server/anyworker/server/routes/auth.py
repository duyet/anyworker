"""AnyRouter account sign-in (loopback PKCE) and identity."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from anyworker.anyrouter import AnyRouterError, LoginFlow
from anyworker.anyrouter.oauth import DEFAULT_BASE_URL, exchange_cli_code
from anyworker.server.manager import SessionManager

from . import deps

log = logging.getLogger(__name__)


@dataclass
class _Attempt:
    """One in-flight sign-in. Lives only for the life of the process."""

    flow: LoginFlow
    status: str = "pending"  # pending | ok | error
    error: str = ""
    has_management_key: bool = False
    task: Optional[asyncio.Task] = field(default=None, repr=False)


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/auth/anyrouter", tags=["auth"])
    attempts: dict[str, _Attempt] = {}

    async def _finish(attempt: _Attempt) -> None:
        """Wait for the browser callback, exchange, and persist the account."""
        try:
            code = await asyncio.to_thread(attempt.flow.wait)
            payload = await exchange_cli_code(
                DEFAULT_BASE_URL, code, attempt.flow.verifier
            )
        except Exception as exc:  # denial, timeout, state mismatch, transport
            attempt.status = "error"
            attempt.error = str(exc) or "Sign-in failed."
            log.warning("AnyRouter sign-in failed: %s", exc)
            return

        management = payload.get("management_key") or {}
        manager.secrets.set_account(
            user_id=str(payload.get("user_id") or ""),
            api_key=str(payload["key"]),
            management_key=str(management.get("secret") or ""),
            scopes=list(management.get("scopes") or []),
            signed_in_at=time.time(),
        )
        attempt.has_management_key = bool(management.get("secret"))
        attempt.status = "ok"

    @router.post("/start")
    async def start() -> dict[str, Any]:
        flow = LoginFlow()
        authorize_url = flow.start()
        request_id = str(uuid.uuid4())
        attempt = _Attempt(flow=flow)
        attempts[request_id] = attempt
        attempt.task = asyncio.create_task(_finish(attempt))
        return {"request_id": request_id, "authorize_url": authorize_url}

    @router.get("/status/{request_id}")
    async def status(request_id: str) -> Any:
        attempt = attempts.get(request_id)
        if attempt is None:
            return JSONResponse({"error": "unknown request"}, status_code=404)
        return {
            "status": attempt.status,
            "error": attempt.error,
            "has_management_key": attempt.has_management_key,
        }

    @router.get("/account")
    async def account() -> Any:
        stored = manager.secrets.get_account()
        if not stored.get("api_key"):
            return {"signed_in": False}
        base = {
            "signed_in": True,
            "user_id": stored.get("user_id") or "",
            "scopes": stored.get("scopes") or [],
            "has_management_key": bool(stored.get("management_key")),
            "signed_in_at": stored.get("signed_in_at"),
            "profile": None,
            "credits": None,
        }
        client = deps.client_for(manager)
        for field_name, call in (
            ("profile", client.profile),
            ("credits", client.credits),
        ):
            try:
                base[field_name] = await call()
            except AnyRouterError as exc:
                # A stale key must not blank the whole screen — surface it.
                base[f"{field_name}_error"] = str(exc)
        return base

    @router.post("/signout")
    async def signout() -> dict[str, Any]:
        manager.secrets.clear_account()
        return {"ok": True}

    return router
