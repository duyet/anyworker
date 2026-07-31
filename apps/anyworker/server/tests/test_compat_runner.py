"""Tests for the CompatRunner (Path B — OpenAI-compatible tool loop)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import patch

import httpx
import pytest

from anyworker.agent.compat_runner import (
    CompatRunner,
    TOOL_REGISTRY,
    TOOL_SCHEMAS,
    _safe_json_parse,
)
from anyworker.agent.events import EventType
from anyworker.policy import PermissionPolicy
from anyworker.server.manager import SessionManager


# ---------------------------------------------------------------------------
# Local tool tests
# ---------------------------------------------------------------------------


def test_read_file_tool(tmp_path: Path) -> None:
    (tmp_path / "hello.txt").write_text("Hello, world!", encoding="utf-8")
    result = json.loads(
        TOOL_REGISTRY["ReadFile"]({"workspace": str(tmp_path), "path": "hello.txt"})
    )
    assert result["ok"] is True
    assert "Hello, world!" in result["content"]


def test_read_file_missing(tmp_path: Path) -> None:
    result = json.loads(
        TOOL_REGISTRY["ReadFile"]({"workspace": str(tmp_path), "path": "nope.txt"})
    )
    assert result["ok"] is False
    assert "not found" in result["error"]


def test_read_file_path_escape(tmp_path: Path) -> None:
    result = json.loads(
        TOOL_REGISTRY["ReadFile"](
            {"workspace": str(tmp_path), "path": "../../../etc/passwd"}
        )
    )
    assert result["ok"] is False
    assert "escapes" in result["error"]


def test_list_files_tool(tmp_path: Path) -> None:
    (tmp_path / "a.txt").write_text("a", encoding="utf-8")
    (tmp_path / "b.txt").write_text("b", encoding="utf-8")
    result = json.loads(
        TOOL_REGISTRY["ListFiles"]({"workspace": str(tmp_path), "path": "."})
    )
    assert result["ok"] is True
    names = {e["name"] for e in result["entries"]}
    assert "a.txt" in names
    assert "b.txt" in names


def test_search_tool(tmp_path: Path) -> None:
    (tmp_path / "file1.txt").write_text("hello world\nfoo bar", encoding="utf-8")
    (tmp_path / "file2.txt").write_text("hello again", encoding="utf-8")
    result = json.loads(
        TOOL_REGISTRY["Search"](
            {"workspace": str(tmp_path), "query": "hello", "path": "."}
        )
    )
    assert result["ok"] is True
    assert result["count"] >= 2
    files = {m["file"] for m in result["matches"]}
    assert "file1.txt" in files
    assert "file2.txt" in files


def test_write_file_tool(tmp_path: Path) -> None:
    result = json.loads(
        TOOL_REGISTRY["WriteFile"](
            {"workspace": str(tmp_path), "path": "out.txt", "content": "written"}
        )
    )
    assert result["ok"] is True
    assert (tmp_path / "out.txt").read_text(encoding="utf-8") == "written"


def test_write_file_path_escape(tmp_path: Path) -> None:
    result = json.loads(
        TOOL_REGISTRY["WriteFile"](
            {"workspace": str(tmp_path), "path": "../escape.txt", "content": "x"}
        )
    )
    assert result["ok"] is False
    assert "escapes" in result["error"]


def test_bash_tool(tmp_path: Path) -> None:
    result = json.loads(
        TOOL_REGISTRY["Bash"]({"workspace": str(tmp_path), "command": "echo hello"})
    )
    assert result["ok"] is True
    assert "hello" in result["stdout"]


# ---------------------------------------------------------------------------
# CompatRunner — error cases
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compat_no_api_key(tmp_path: Path) -> None:
    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="",
        base_url="https://api.openai.com/v1",
    )
    events = []
    async for event in runner.run_turn("hello"):
        events.append(event)
    assert events[0].type == EventType.ERROR
    assert "No API key" in events[0].payload["message"]
    assert events[-1].type == EventType.TURN_END
    assert events[-1].payload["subtype"] == "error"


@pytest.mark.asyncio
async def test_compat_no_base_url(tmp_path: Path) -> None:
    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="",
    )
    events = []
    async for event in runner.run_turn("hello"):
        events.append(event)
    assert events[0].type == EventType.ERROR
    assert "No base URL" in events[0].payload["message"]


# ---------------------------------------------------------------------------
# CompatRunner — mocked OpenAI API
# ---------------------------------------------------------------------------


def _sse_chunk(data: dict[str, Any]) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


def _mock_openai_handler(
    *,
    text_chunks: list[str] | None = None,
    tool_calls: list[dict[str, Any]] | None = None,
    status: int = 200,
    error_msg: str | None = None,
):
    """Return a handler function that mocks the OpenAI chat completions endpoint."""

    def handler(request: httpx.Request) -> httpx.Response:
        if status != 200:
            return httpx.Response(
                status_code=status,
                json={"error": {"message": error_msg or "API error"}},
            )

        chunks: list[str] = []

        # Text content
        if text_chunks:
            for chunk in text_chunks:
                chunks.append(
                    _sse_chunk({"choices": [{"delta": {"content": chunk}}]})
                )

        # Tool calls
        if tool_calls:
            for i, tc in enumerate(tool_calls):
                chunks.append(
                    _sse_chunk(
                        {
                            "choices": [
                                {
                                    "delta": {
                                        "tool_calls": [
                                            {
                                                "index": i,
                                                "id": tc.get("id", f"call_{i}"),
                                                "function": {
                                                    "name": tc["name"],
                                                    "arguments": json.dumps(tc["args"]),
                                                },
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    )
                )

        chunks.append(_sse_chunk({"choices": [{"finish_reason": "stop"}]}))
        chunks.append("data: [DONE]\n\n")

        return httpx.Response(
            status_code=200,
            headers={"content-type": "text/event-stream"},
            content="".join(chunks).encode("utf-8"),
        )

    return handler


def _run_with_mock(runner: CompatRunner, prompt: str) -> list:
    """Run the runner with a mock transport and return events."""
    # Create a real client with the mock transport BEFORE patching
    mock_transport = runner._mock_transport  # set by caller
    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async def collect():
            async for event in runner.run_turn(prompt):
                events.append(event)
        import asyncio
        asyncio.get_event_loop().run_until_complete(collect())
    # Close the real client
    import asyncio
    asyncio.get_event_loop().run_until_complete(real_client.aclose())
    return events


@pytest.mark.asyncio
async def test_compat_text_only(tmp_path: Path) -> None:
    """Test that the runner streams text content correctly."""
    handler = _mock_openai_handler(text_chunks=["Hello", " world!"])
    mock_transport = httpx.MockTransport(handler)

    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )

    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async for event in runner.run_turn("hi"):
            events.append(event)
    await real_client.aclose()

    types = [e.type for e in events]
    assert EventType.TURN_START in types
    assert EventType.TEXT_DELTA in types
    assert EventType.TURN_END in types

    text = "".join(
        e.payload.get("text", "") for e in events if e.type == EventType.TEXT_DELTA
    )
    assert "Hello" in text
    assert "world!" in text


@pytest.mark.asyncio
async def test_compat_tool_call_auto_approved(tmp_path: Path) -> None:
    """Test that auto-approved tools (ReadFile) execute and results are sent back."""
    (tmp_path / "data.txt").write_text("file content here", encoding="utf-8")

    call_count = [0]

    def stateful_handler(request: httpx.Request) -> httpx.Response:
        call_count[0] += 1
        if call_count[0] == 1:
            # First request: return a ReadFile tool call
            chunks = [
                _sse_chunk({
                    "choices": [{
                        "delta": {
                            "tool_calls": [{
                                "index": 0,
                                "id": "call_1",
                                "function": {
                                    "name": "ReadFile",
                                    "arguments": json.dumps({"path": "data.txt"}),
                                },
                            }]
                        }
                    }]
                }),
                _sse_chunk({"choices": [{"finish_reason": "tool_calls"}]}),
                "data: [DONE]\n\n",
            ]
        else:
            # Second request: return text (after tool result is sent back)
            chunks = [
                _sse_chunk({"choices": [{"delta": {"content": "Found it!"}}]}),
                _sse_chunk({"choices": [{"finish_reason": "stop"}]}),
                "data: [DONE]\n\n",
            ]
        return httpx.Response(
            status_code=200,
            headers={"content-type": "text/event-stream"},
            content="".join(chunks).encode("utf-8"),
        )

    mock_transport = httpx.MockTransport(stateful_handler)

    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )

    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async for event in runner.run_turn("read data.txt"):
            events.append(event)
    await real_client.aclose()

    types = [e.type for e in events]
    assert EventType.TOOL_START in types
    assert EventType.TOOL_END in types

    tool_end = next(e for e in events if e.type == EventType.TOOL_END)
    assert "file content here" in tool_end.payload.get("result", "")


@pytest.mark.asyncio
async def test_compat_api_error(tmp_path: Path) -> None:
    """Test that API errors are handled gracefully."""
    handler = _mock_openai_handler(status=401, error_msg="Invalid API key")
    mock_transport = httpx.MockTransport(handler)

    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-bad",
        base_url="https://api.openai.com/v1",
    )

    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async for event in runner.run_turn("hi"):
            events.append(event)
    await real_client.aclose()

    types = [e.type for e in events]
    assert EventType.ERROR in types
    error_event = next(e for e in events if e.type == EventType.ERROR)
    assert "401" in error_event.payload["message"] or "Invalid API key" in error_event.payload["message"]


# ---------------------------------------------------------------------------
# CompatRunner — approval flow
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compat_requires_approval(tmp_path: Path) -> None:
    """Test that WriteFile/Bash tools go through the approver."""
    (tmp_path / "data.txt").write_text("content", encoding="utf-8")

    call_count = [0]

    def stateful_handler(request: httpx.Request) -> httpx.Response:
        call_count[0] += 1
        if call_count[0] == 1:
            # First request: return a WriteFile tool call
            chunks = [
                _sse_chunk({
                    "choices": [{
                        "delta": {
                            "tool_calls": [{
                                "index": 0,
                                "id": "call_1",
                                "function": {
                                    "name": "WriteFile",
                                    "arguments": json.dumps({"path": "out.txt", "content": "hello"}),
                                },
                            }]
                        }
                    }]
                }),
                _sse_chunk({"choices": [{"finish_reason": "tool_calls"}]}),
                "data: [DONE]\n\n",
            ]
        else:
            # Second request: return text (after tool result is sent back)
            chunks = [
                _sse_chunk({"choices": [{"delta": {"content": "Done!"}}]}),
                _sse_chunk({"choices": [{"finish_reason": "stop"}]}),
                "data: [DONE]\n\n",
            ]
        return httpx.Response(
            status_code=200,
            headers={"content-type": "text/event-stream"},
            content="".join(chunks).encode("utf-8"),
        )

    mock_transport = httpx.MockTransport(stateful_handler)

    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )

    approval_received = []

    async def approver(request: dict[str, Any]) -> str:
        approval_received.append(request)
        return "once"

    runner.approver = approver

    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async for event in runner.run_turn("write a file"):
            events.append(event)
    await real_client.aclose()

    types = [e.type for e in events]
    assert EventType.PERMISSION_REQUIRED in types
    assert len(approval_received) == 1
    assert approval_received[0]["tool_name"] == "WriteFile"


@pytest.mark.asyncio
async def test_compat_always_tool_survives_a_new_runner(tmp_path: Path) -> None:
    """`always_tool` is durable: a fresh runner for the same workspace skips approval."""
    workspace = tmp_path / "ws"
    workspace.mkdir()
    policy = PermissionPolicy(tmp_path / "permissions.json")

    call_count = [0]

    def stateful_handler(request: httpx.Request) -> httpx.Response:
        call_count[0] += 1
        if call_count[0] % 2 == 1:
            chunks = [
                _sse_chunk({
                    "choices": [{
                        "delta": {
                            "tool_calls": [{
                                "index": 0,
                                "id": "call_1",
                                "function": {
                                    "name": "WriteFile",
                                    "arguments": json.dumps({"path": "out.txt", "content": "hello"}),
                                },
                            }]
                        }
                    }]
                }),
                _sse_chunk({"choices": [{"finish_reason": "tool_calls"}]}),
                "data: [DONE]\n\n",
            ]
        else:
            chunks = [
                _sse_chunk({"choices": [{"delta": {"content": "Done!"}}]}),
                _sse_chunk({"choices": [{"finish_reason": "stop"}]}),
                "data: [DONE]\n\n",
            ]
        return httpx.Response(
            status_code=200,
            headers={"content-type": "text/event-stream"},
            content="".join(chunks).encode("utf-8"),
        )

    mock_transport = httpx.MockTransport(stateful_handler)
    approvals: list[dict[str, Any]] = []

    async def approver(request: dict[str, Any]) -> str:
        approvals.append(request)
        return "always_tool"

    async def run_once() -> list:
        runner = CompatRunner(
            session_id="s1",
            workspace=str(workspace),
            model="gpt-4",
            api_key="sk-test",
            base_url="https://api.openai.com/v1",
            approver=approver,
            policy=policy,
        )
        real_client = httpx.AsyncClient(transport=mock_transport)
        events = []
        with patch("httpx.AsyncClient", return_value=real_client):
            async for event in runner.run_turn("write a file"):
                events.append(event)
        await real_client.aclose()
        return events

    first = await run_once()
    assert EventType.PERMISSION_REQUIRED in [e.type for e in first]
    assert len(approvals) == 1

    # A new runner — exactly what `run_user_turn` builds on the next turn.
    second = await run_once()
    assert EventType.PERMISSION_REQUIRED not in [e.type for e in second]
    assert len(approvals) == 1
    assert EventType.TOOL_END in [e.type for e in second]


@pytest.mark.asyncio
async def test_compat_denied_tool(tmp_path: Path) -> None:
    """Test that denied tools stop the turn."""

    def handler(request: httpx.Request) -> httpx.Response:
        chunks = [
            _sse_chunk({
                "choices": [{
                    "delta": {
                        "tool_calls": [{
                            "index": 0,
                            "id": "call_1",
                            "function": {
                                "name": "Bash",
                                "arguments": json.dumps({"command": "rm -rf /"}),
                            },
                        }]
                    }
                }]
            }),
            _sse_chunk({"choices": [{"finish_reason": "tool_calls"}]}),
            "data: [DONE]\n\n",
        ]
        return httpx.Response(
            status_code=200,
            headers={"content-type": "text/event-stream"},
            content="".join(chunks).encode("utf-8"),
        )

    mock_transport = httpx.MockTransport(handler)

    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )

    async def approver(request: dict[str, Any]) -> str:
        return "deny"

    runner.approver = approver

    real_client = httpx.AsyncClient(transport=mock_transport)
    events = []
    with patch("httpx.AsyncClient", return_value=real_client):
        async for event in runner.run_turn("delete everything"):
            events.append(event)
    await real_client.aclose()

    types = [e.type for e in events]
    assert EventType.PERMISSION_REQUIRED in types
    assert EventType.ERROR in types
    assert EventType.TURN_END in types
    error_event = next(e for e in events if e.type == EventType.ERROR)
    assert "denied" in error_event.payload["message"].lower()


# ---------------------------------------------------------------------------
# CompatRunner — interrupt
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compat_interrupt(tmp_path: Path) -> None:
    """Test that interrupt stops the turn."""
    runner = CompatRunner(
        session_id="s1",
        workspace=str(tmp_path),
        model="gpt-4",
        api_key="sk-test",
        base_url="https://api.openai.com/v1",
    )
    runner._interrupted = True

    events = []
    async for event in runner.run_turn("hi"):
        events.append(event)

    types = [e.type for e in events]
    assert EventType.TURN_START in types
    assert EventType.TURN_END in types
    turn_end = next(e for e in events if e.type == EventType.TURN_END)
    assert turn_end.payload["subtype"] == "interrupted"


# ---------------------------------------------------------------------------
# Session manager — compat session creation
# ---------------------------------------------------------------------------


def test_compat_session_creation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that creating a session with a compat provider sets the right harness."""
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    manager = SessionManager()
    session = manager.create_session(
        workspace=str(tmp_path),
        title="Compat test",
        provider="openai",
        model="gpt-4",
    )
    assert session.harness == "compat"
    assert session.provider == "openai"
    assert session.model == "gpt-4"


def test_cas_session_creation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that creating a session with a CAS provider sets the right harness."""
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    manager = SessionManager()
    session = manager.create_session(
        workspace=str(tmp_path),
        title="CAS test",
        provider="anyrouter",
        model="anyrouter/cowork",
    )
    assert session.harness == "cas"
    assert session.provider == "anyrouter"


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------


def test_tool_schemas_complete() -> None:
    """Verify all expected tools have schemas."""
    names = {s["function"]["name"] for s in TOOL_SCHEMAS}
    expected = {"ReadFile", "ReadPdf", "ReadXlsx", "ReadCsv", "ListFiles", "Search", "WriteFile", "Bash"}
    assert names == expected


def test_safe_json_parse() -> None:
    assert _safe_json_parse('{"a": 1}') == {"a": 1}
    assert _safe_json_parse("not json") == {}
    assert _safe_json_parse("[1, 2]") == {}
    assert _safe_json_parse("") == {}
