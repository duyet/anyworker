"""Path A — Claude Agent SDK session runner."""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, Optional

from .events import Event, EventType
from .prompt import ANYWORKER_COWORK_PROMPT

log = logging.getLogger(__name__)

ApprovalOutcome = str  # "once" | "always_tool" | "deny"

Approver = Callable[[dict[str, Any]], Awaitable[ApprovalOutcome]]


def _cas_available() -> bool:
    try:
        import claude_agent_sdk  # noqa: F401

        return True
    except ImportError:
        return False


class CasRunner:
    """Wraps ClaudeSDKClient and maps messages to wire events."""

    def __init__(
        self,
        *,
        session_id: str,
        workspace: str,
        model: Optional[str] = None,
        env: Optional[dict[str, str]] = None,
        approver: Optional[Approver] = None,
    ) -> None:
        self.session_id = session_id
        self.workspace = workspace
        self.model = model
        self.env = dict(env or {})
        self.approver = approver
        self._client: Any = None
        self._session_allow_tools: set[str] = set()

    async def aclose(self) -> None:
        if self._client is not None:
            try:
                await self._client.disconnect()
            except Exception:
                log.exception("CAS disconnect failed")
            self._client = None

    async def interrupt(self) -> None:
        if self._client is not None:
            await self._client.interrupt()

    def _permission_handler(self) -> Any:
        from claude_agent_sdk.types import (
            PermissionResultAllow,
            PermissionResultDeny,
        )

        async def can_use_tool(
            tool_name: str, input_data: dict, context: Any
        ) -> PermissionResultAllow | PermissionResultDeny:
            if tool_name in self._session_allow_tools:
                return PermissionResultAllow(updated_input=input_data)

            # Auto-allow read-only tools so the loop stays snappy.
            if tool_name in {"Read", "Glob", "Grep", "WebSearch", "WebFetch"}:
                return PermissionResultAllow(updated_input=input_data)

            if self.approver is None:
                return PermissionResultDeny(
                    message="No approval channel wired", interrupt=False
                )

            request = {
                "id": str(uuid.uuid4()),
                "tool_name": tool_name,
                "arguments": input_data,
                "reason": f"AnyWorker wants to run {tool_name}",
            }
            outcome = await self.approver(request)
            if outcome == "deny":
                return PermissionResultDeny(message="User denied", interrupt=False)
            if outcome == "always_tool":
                self._session_allow_tools.add(tool_name)
            return PermissionResultAllow(updated_input=input_data)

        return can_use_tool

    async def run_turn(self, prompt: str) -> AsyncIterator[Event]:
        if not _cas_available():
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={
                    "message": "claude-agent-sdk is not installed",
                },
            )
            return

        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
        from claude_agent_sdk import (
            AssistantMessage,
            ResultMessage,
            TextBlock,
            ToolUseBlock,
        )

        yield Event(
            type=EventType.TURN_START,
            session_id=self.session_id,
            payload={},
        )

        # Read tools auto-approved; writes/bash go through can_use_tool.
        options = ClaudeAgentOptions(
            cwd=self.workspace,
            model=self.model,
            system_prompt=ANYWORKER_COWORK_PROMPT,
            allowed_tools=["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
            permission_mode="default",
            can_use_tool=self._permission_handler(),
            env=self.env,
            setting_sources=["project"],
            include_partial_messages=True,
        )

        try:
            self._client = ClaudeSDKClient(options=options)
            await self._client.connect()
            await self._client.query(prompt)

            async for message in self._client.receive_response():
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            yield Event(
                                type=EventType.TEXT,
                                session_id=self.session_id,
                                payload={"text": block.text},
                            )
                        elif isinstance(block, ToolUseBlock):
                            yield Event(
                                type=EventType.TOOL_START,
                                session_id=self.session_id,
                                payload={
                                    "name": block.name,
                                    "id": getattr(block, "id", None),
                                    "input": getattr(block, "input", {}),
                                },
                            )
                elif isinstance(message, ResultMessage):
                    yield Event(
                        type=EventType.TURN_END,
                        session_id=self.session_id,
                        payload={
                            "subtype": getattr(message, "subtype", None),
                            "result": getattr(message, "result", None),
                            "cost_usd": getattr(message, "total_cost_usd", None),
                        },
                    )
                else:
                    # Forward raw type for GUI debugging / partials.
                    msg_type = getattr(message, "type", None) or type(message).__name__
                    if msg_type == "stream_event" or "partial" in str(msg_type).lower():
                        text = _extract_partial_text(message)
                        if text:
                            yield Event(
                                type=EventType.TEXT_DELTA,
                                session_id=self.session_id,
                                payload={"text": text},
                            )
        except Exception as exc:
            log.exception("CAS turn failed")
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={"message": str(exc)},
            )
            yield Event(
                type=EventType.TURN_END,
                session_id=self.session_id,
                payload={"subtype": "error"},
            )


def _extract_partial_text(message: Any) -> str:
    for attr in ("text", "delta", "event"):
        val = getattr(message, attr, None)
        if isinstance(val, str) and val:
            return val
        if isinstance(val, dict):
            t = val.get("text") or val.get("partial")
            if isinstance(t, str):
                return t
    return ""
