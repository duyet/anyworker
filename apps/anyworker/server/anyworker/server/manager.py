"""Session manager — owns live runners and transcript buffers."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Awaitable, Optional

from anyworker.agent.cas_runner import CasRunner
from anyworker.agent.compat_runner import CompatRunner
from anyworker.agent.events import Event, EventType
from anyworker.config import state_dir
from anyworker.providers.registry import get_provider
from anyworker.providers.secrets import SecretStore

log = logging.getLogger(__name__)


@dataclass
class Session:
    id: str
    title: str
    workspace: str
    provider: str
    model: str
    harness: str
    created_at: float
    messages: list[dict[str, Any]] = field(default_factory=list)
    runner: Optional[CasRunner] = None
    pending_approvals: dict[str, asyncio.Future] = field(default_factory=dict)
    subscribers: list[asyncio.Queue] = field(default_factory=list)


class SessionManager:
    def __init__(self) -> None:
        self.secrets = SecretStore()
        self.sessions: dict[str, Session] = {}
        self._load_index()

    def _index_path(self) -> Path:
        return state_dir() / "sessions.json"

    def _load_index(self) -> None:
        path = self._index_path()
        if not path.exists():
            return
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            for item in raw.get("sessions", []):
                sid = item["id"]
                self.sessions[sid] = Session(
                    id=sid,
                    title=item.get("title") or "Untitled",
                    workspace=item.get("workspace") or "",
                    provider=item.get("provider") or "anthropic",
                    model=item.get("model") or "",
                    harness=item.get("harness") or "cas",
                    created_at=item.get("created_at") or time.time(),
                    messages=item.get("messages") or [],
                )
        except Exception:
            log.exception("Failed to load session index")

    def _save_index(self) -> None:
        payload = {
            "sessions": [
                {
                    "id": s.id,
                    "title": s.title,
                    "workspace": s.workspace,
                    "provider": s.provider,
                    "model": s.model,
                    "harness": s.harness,
                    "created_at": s.created_at,
                    "messages": s.messages[-200:],  # cap
                }
                for s in self.sessions.values()
            ]
        }
        path = self._index_path()
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def list_sessions(self, workspace: Optional[str] = None) -> list[dict[str, Any]]:
        items = list(self.sessions.values())
        if workspace:
            items = [s for s in items if s.workspace == workspace]
        items.sort(key=lambda s: s.created_at, reverse=True)
        return [
            {
                "id": s.id,
                "title": s.title,
                "workspace": s.workspace,
                "provider": s.provider,
                "model": s.model,
                "harness": s.harness,
                "created_at": s.created_at,
            }
            for s in items
        ]

    def create_session(
        self,
        *,
        workspace: str,
        title: str = "New session",
        provider: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Session:
        active = self.secrets.get_active()
        provider = provider or active.get("provider") or "anthropic"
        model = model or active.get("model") or ""
        desc = get_provider(provider)
        harness = desc.harness if desc else "cas"
        if not workspace:
            workspace = active.get("workspace") or str(Path.home())
        session = Session(
            id=str(uuid.uuid4()),
            title=title,
            workspace=workspace,
            provider=provider,
            model=model,
            harness=harness,
            created_at=time.time(),
        )
        self.sessions[session.id] = session
        self._save_index()
        return session

    def get(self, session_id: str) -> Optional[Session]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        session = self.sessions.pop(session_id, None)
        if not session:
            return False
        if session.runner:
            asyncio.create_task(session.runner.aclose())
        self._save_index()
        return True

    def rename_session(self, session_id: str, title: str) -> bool:
        session = self.sessions.get(session_id)
        if not session:
            return False
        session.title = title.strip() or session.title
        self._save_index()
        return True

    async def subscribe(self, session_id: str) -> asyncio.Queue:
        session = self.sessions[session_id]
        q: asyncio.Queue = asyncio.Queue()
        session.subscribers.append(q)
        return q

    def unsubscribe(self, session_id: str, q: asyncio.Queue) -> None:
        session = self.sessions.get(session_id)
        if not session:
            return
        if q in session.subscribers:
            session.subscribers.remove(q)

    async def _broadcast(self, session: Session, event: Event) -> None:
        data = event.model_dump()
        for q in list(session.subscribers):
            await q.put(data)

    async def resolve_approval(
        self, session_id: str, approval_id: str, outcome: str
    ) -> bool:
        session = self.sessions.get(session_id)
        if not session:
            return False
        fut = session.pending_approvals.get(approval_id)
        if not fut or fut.done():
            return False
        fut.set_result(outcome)
        return True

    async def _make_approver(self, session: Session) -> Callable[[dict[str, Any]], Awaitable[str]]:
        """Build an approver callback that broadcasts permission requests."""

        async def approver(request: dict[str, Any]) -> str:
            approval_id = request["id"]
            fut: asyncio.Future = asyncio.get_event_loop().create_future()
            session.pending_approvals[approval_id] = fut
            await self._broadcast(
                session,
                Event(
                    type=EventType.PERMISSION_REQUIRED,
                    session_id=session.id,
                    id=approval_id,
                    payload=request,
                ),
            )
            try:
                return await asyncio.wait_for(fut, timeout=600)
            except asyncio.TimeoutError:
                return "deny"
            finally:
                session.pending_approvals.pop(approval_id, None)

        return approver

    async def run_user_turn(self, session_id: str, text: str) -> None:
        session = self.sessions.get(session_id)
        if not session:
            return

        session.messages.append({"role": "user", "content": text})
        if session.title in {"New session", "Untitled"} and text.strip():
            session.title = text.strip()[:60]

        approver = await self._make_approver(session)

        if session.harness == "cas":
            env = self.secrets.cas_env(session.provider)
            runner: CasRunner | CompatRunner = CasRunner(
                session_id=session.id,
                workspace=session.workspace,
                model=session.model or None,
                env=env,
                approver=approver,
            )
        else:
            # Path B — thin OpenAI-compatible tool loop.
            desc = get_provider(session.provider)
            profile = self.secrets.get_provider_profile(session.provider)
            api_key = self.secrets.resolve_api_key(
                session.provider, desc.env_key if desc else ""
            )
            base_url = (profile.get("base_url") or "").strip()
            if not base_url and desc and desc.default_base_url:
                base_url = desc.default_base_url
            if not base_url and session.provider == "openai":
                base_url = "https://api.openai.com/v1"
            runner = CompatRunner(
                session_id=session.id,
                workspace=session.workspace,
                model=session.model or None,
                api_key=api_key,
                base_url=base_url,
                approver=approver,
            )
        session.runner = runner

        assistant_bits: list[str] = []
        async for event in runner.run_turn(text):
            if event.type == EventType.TEXT and event.payload.get("text"):
                assistant_bits.append(str(event.payload["text"]))
            await self._broadcast(session, event)

        if assistant_bits:
            session.messages.append(
                {"role": "assistant", "content": "".join(assistant_bits)}
            )
        self._save_index()
        await runner.aclose()
        session.runner = None

    async def aclose(self) -> None:
        for session in self.sessions.values():
            if session.runner:
                await session.runner.aclose()
