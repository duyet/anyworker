"""Tests for the per-session activity log."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from anyworker.activity import REDACTED, ActivityLog
from anyworker.agent.events import Event, EventType
from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


def test_append_and_read_back(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path)
    activity.append("s1", EventType.TURN_START, {"prompt": "write a memo"})
    activity.append("s1", EventType.TOOL_START, {"name": "WriteFile"})

    records = activity.read("s1")
    assert [r["type"] for r in records] == ["tool_start", "turn_start"]
    assert records[1]["payload"]["prompt"] == "write a memo"
    assert records[0]["session_id"] == "s1"


def test_sessions_are_separate_files(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path)
    activity.append("s1", EventType.TURN_START, {})
    activity.append("s2", EventType.TURN_START, {})

    assert len(activity.read("s1")) == 1
    assert activity.path_for("s2").exists()


def test_newest_first_with_limit_and_before(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path)
    for i in range(5):
        activity.append("s1", EventType.TOOL_END, {"name": f"t{i}"})

    newest = activity.read("s1", limit=2)
    assert [r["payload"]["name"] for r in newest] == ["t4", "t3"]

    older = activity.read("s1", before=newest[-1]["ts"])
    assert [r["payload"]["name"] for r in older] == ["t2", "t1", "t0"]


def test_rotation_keeps_one_generation(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path, max_bytes=200)
    for i in range(40):
        activity.append("s1", EventType.TOOL_END, {"name": f"t{i}"})

    assert activity.path_for("s1").with_suffix(".jsonl.1").exists()
    assert activity.path_for("s1").stat().st_size <= 200 + 1024
    # The live file stays small; the rotated one is still readable.
    names = [r["payload"]["name"] for r in activity.read("s1", limit=100)]
    assert names[0] == "t39"


def test_redacts_key_shaped_args(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path)
    activity.append(
        "s1",
        EventType.TOOL_START,
        {"name": "Bash", "input": {"api_key": "sk-ar-v1-secret", "path": "out.txt"}},
    )
    payload = activity.read("s1")[0]["payload"]
    assert payload["input"]["api_key"] == REDACTED
    assert payload["input"]["path"] == "out.txt"


def test_truncates_long_values(tmp_path: Path) -> None:
    activity = ActivityLog(tmp_path)
    activity.append("s1", EventType.TOOL_START, {"content": "x" * 5000})
    content = activity.read("s1")[0]["payload"]["content"]
    assert len(content) < 600
    assert content.endswith("…")


def test_read_missing_session_is_empty(tmp_path: Path) -> None:
    assert ActivityLog(tmp_path).read("nope") == []


@pytest.mark.asyncio
async def test_manager_broadcast_records_activity(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    manager = SessionManager()
    session = manager.create_session(workspace=str(tmp_path), title="t")

    await manager._broadcast(
        session, Event(type=EventType.TOOL_START, session_id=session.id, payload={"name": "WriteFile"})
    )
    await manager._broadcast(
        session, Event(type=EventType.TEXT_DELTA, session_id=session.id, payload={"text": "hi"})
    )

    records = manager.activity.read(session.id)
    assert [r["type"] for r in records] == ["tool_start"]


def test_activity_route_returns_newest_first(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    manager = SessionManager()
    client = TestClient(create_app(manager))
    session = manager.create_session(workspace=str(tmp_path), title="t")

    manager.activity.append(session.id, EventType.TURN_START, {})
    manager.activity.append(session.id, EventType.TURN_END, {"subtype": "ok"})

    records = client.get(f"/v1/sessions/{session.id}/activity").json()["records"]
    assert [r["type"] for r in records] == ["turn_end", "turn_start"]
    assert client.get(f"/v1/sessions/{session.id}/activity?limit=1").json()["records"][
        0
    ]["type"] == "turn_end"
