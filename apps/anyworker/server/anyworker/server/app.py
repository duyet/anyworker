"""FastAPI control plane for the AnyWorker desktop sidecar."""

from __future__ import annotations

import asyncio
import logging
import re
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from anyworker.providers.registry import list_providers
from anyworker.server.manager import SessionManager

log = logging.getLogger(__name__)

_ALLOWED_ORIGIN_RE = re.compile(
    r"^(tauri://localhost"
    r"|https?://localhost(:\d+)?"
    r"|https?://127\.0\.0\.1(:\d+)?"
    r"|https?://tauri\.localhost)$"
)


def _origin_allowed(origin: str | None) -> bool:
    return origin is None or bool(_ALLOWED_ORIGIN_RE.match(origin))


class CreateSessionBody(BaseModel):
    workspace: str = ""
    title: str = "New session"
    provider: Optional[str] = None
    model: Optional[str] = None


class PatchSessionBody(BaseModel):
    title: Optional[str] = None


class ProviderProfileBody(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)


class ActiveModelBody(BaseModel):
    provider: str
    model: str
    workspace: Optional[str] = None


class ApprovalBody(BaseModel):
    outcome: str  # once | always_tool | deny


def create_app(manager: SessionManager) -> FastAPI:
    app = FastAPI(title="AnyWorker", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def origin_gate(request, call_next):
        origin = request.headers.get("origin")
        if origin and not _origin_allowed(origin):
            from fastapi.responses import JSONResponse

            return JSONResponse({"error": "origin not allowed"}, status_code=403)
        return await call_next(request)

    @app.get("/v1/health")
    async def health() -> dict[str, Any]:
        active = manager.secrets.get_active()
        return {
            "status": "ok",
            "product": "anyworker",
            "default_workspace": active.get("workspace"),
            "model": active.get("model"),
            "provider": active.get("provider"),
        }

    @app.get("/v1/providers")
    async def providers() -> dict[str, Any]:
        return {"providers": list_providers()}

    @app.get("/v1/settings")
    async def get_settings() -> dict[str, Any]:
        active = manager.secrets.get_active()
        # Never return raw secrets in list; only whether configured.
        configured = {}
        for p in list_providers():
            profile = manager.secrets.get_provider_profile(p["name"])
            configured[p["name"]] = {
                "has_key": bool(profile.get("api_key")),
                "base_url": profile.get("base_url") or p.get("default_base_url") or "",
            }
        return {"active": active, "configured": configured}

    @app.post("/v1/providers/{name}")
    async def set_provider(name: str, body: ProviderProfileBody) -> dict[str, Any]:
        manager.secrets.set_provider_profile(name, body.profile)
        return {"ok": True}

    @app.post("/v1/settings/active")
    async def set_active(body: ActiveModelBody) -> dict[str, Any]:
        manager.secrets.set_active(
            provider=body.provider, model=body.model, workspace=body.workspace
        )
        return {"ok": True, "active": manager.secrets.get_active()}

    @app.get("/v1/workspaces/recent")
    async def recent_workspaces() -> dict[str, Any]:
        # MVP: derive from sessions.
        seen: dict[str, str] = {}
        for s in manager.list_sessions():
            w = s.get("workspace") or ""
            if w and w not in seen:
                seen[w] = Path(w).name or w
        return {
            "workspaces": [
                {"path": p, "name": n, "exists": Path(p).exists()}
                for p, n in seen.items()
            ]
        }

    @app.post("/v1/workspaces/open")
    async def open_workspace(body: dict[str, Any]) -> dict[str, Any]:
        path = Path(body.get("path") or "").expanduser()
        create = bool(body.get("create"))
        if create and not path.exists():
            path.mkdir(parents=True, exist_ok=True)
        if not path.exists() or not path.is_dir():
            return {"ok": False, "error": "path not found"}
        active = manager.secrets.get_active()
        manager.secrets.set_active(
            provider=active.get("provider") or "anthropic",
            model=active.get("model") or "",
            workspace=str(path.resolve()),
        )
        return {"ok": True, "path": str(path.resolve())}

    @app.get("/v1/sessions")
    async def sessions(workspace: Optional[str] = None) -> dict[str, Any]:
        return {"sessions": manager.list_sessions(workspace)}

    @app.post("/v1/sessions")
    async def create_session(body: CreateSessionBody) -> dict[str, Any]:
        session = manager.create_session(
            workspace=body.workspace,
            title=body.title,
            provider=body.provider,
            model=body.model,
        )
        return {
            "id": session.id,
            "title": session.title,
            "workspace": session.workspace,
            "provider": session.provider,
            "model": session.model,
            "harness": session.harness,
        }

    @app.get("/v1/sessions/{session_id}/messages")
    async def messages(session_id: str) -> dict[str, Any]:
        session = manager.get(session_id)
        if not session:
            return {"messages": [], "error": "not found"}
        return {"messages": session.messages}

    @app.patch("/v1/sessions/{session_id}")
    async def patch_session(session_id: str, body: PatchSessionBody) -> dict[str, Any]:
        if body.title is not None:
            ok = manager.rename_session(session_id, body.title)
            return {"ok": ok}
        return {"ok": True}

    @app.delete("/v1/sessions/{session_id}")
    async def delete_session(session_id: str) -> dict[str, Any]:
        return {"ok": manager.delete_session(session_id)}

    @app.post("/v1/sessions/{session_id}/approvals/{approval_id}")
    async def approve(
        session_id: str, approval_id: str, body: ApprovalBody
    ) -> dict[str, Any]:
        ok = await manager.resolve_approval(session_id, approval_id, body.outcome)
        return {"ok": ok}

    @app.websocket("/v1/sessions/{session_id}/ws")
    async def session_ws(websocket: WebSocket, session_id: str) -> None:
        origin = websocket.headers.get("origin")
        if origin and not _origin_allowed(origin):
            await websocket.close(code=1008)
            return

        session = manager.get(session_id)
        if not session:
            await websocket.close(code=4404)
            return

        await websocket.accept()
        queue = await manager.subscribe(session_id)
        pump = asyncio.create_task(_pump_events(websocket, queue))
        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type")
                if msg_type == "user_message":
                    text = (data.get("text") or "").strip()
                    if text:
                        asyncio.create_task(manager.run_user_turn(session_id, text))
                elif msg_type == "approval":
                    await manager.resolve_approval(
                        session_id,
                        data.get("id") or "",
                        data.get("outcome") or "deny",
                    )
                elif msg_type == "interrupt":
                    if session.runner:
                        await session.runner.interrupt()
                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception:
            log.exception("WS error")
        finally:
            pump.cancel()
            manager.unsubscribe(session_id, queue)

    return app


async def _pump_events(websocket: WebSocket, queue: asyncio.Queue) -> None:
    try:
        while True:
            event = await queue.get()
            await websocket.send_json(event)
    except asyncio.CancelledError:
        return
    except Exception:
        log.exception("event pump failed")
