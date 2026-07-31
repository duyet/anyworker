"""Tests for the durable permission policy."""

from __future__ import annotations

import os
import stat
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from anyworker.policy import PermissionPolicy
from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


def test_allow_round_trips_across_instances(tmp_path: Path) -> None:
    path = tmp_path / "permissions.json"
    policy = PermissionPolicy(path)
    policy.record_outcome("/ws/a", "WriteFile", "always_tool")

    reloaded = PermissionPolicy(path)
    assert reloaded.is_allowed("/ws/a", "WriteFile") is True


def test_once_and_deny_are_not_durable(tmp_path: Path) -> None:
    policy = PermissionPolicy(tmp_path / "permissions.json")
    policy.record_outcome("/ws/a", "Bash", "once")
    policy.record_outcome("/ws/a", "Bash", "deny")
    assert policy.is_allowed("/ws/a", "Bash") is False


def test_policy_file_is_owner_only(tmp_path: Path) -> None:
    policy = PermissionPolicy(tmp_path / "permissions.json")
    policy.allow("/ws/a", "WriteFile")
    assert stat.S_IMODE(os.stat(policy.path).st_mode) == 0o600


def test_permissions_tightened_on_load(tmp_path: Path) -> None:
    path = tmp_path / "permissions.json"
    path.write_text('{"workspaces": {}}', encoding="utf-8")
    os.chmod(path, 0o644)
    PermissionPolicy(path)
    assert stat.S_IMODE(os.stat(path).st_mode) == 0o600


def test_workspaces_are_isolated(tmp_path: Path) -> None:
    policy = PermissionPolicy(tmp_path / "permissions.json")
    policy.allow("/ws/a", "WriteFile")
    assert policy.is_allowed("/ws/a", "WriteFile") is True
    assert policy.is_allowed("/ws/b", "WriteFile") is False


def test_revoke_removes_the_rule(tmp_path: Path) -> None:
    path = tmp_path / "permissions.json"
    policy = PermissionPolicy(path)
    policy.allow("/ws/a", "Bash")

    assert policy.revoke("/ws/a", "Bash") is True
    assert policy.is_allowed("/ws/a", "Bash") is False
    assert policy.revoke("/ws/a", "Bash") is False
    assert PermissionPolicy(path).is_allowed("/ws/a", "Bash") is False


def test_list_rules_is_scoped_to_the_workspace(tmp_path: Path) -> None:
    policy = PermissionPolicy(tmp_path / "permissions.json")
    policy.allow("/ws/a", "WriteFile")
    policy.allow("/ws/b", "Bash")

    rules = policy.list_rules("/ws/a")
    assert [r["tool"] for r in rules] == ["WriteFile"]
    assert rules[0]["decision"] == "allow"
    assert rules[0]["decided_at"] > 0


def test_corrupt_file_does_not_crash(tmp_path: Path) -> None:
    path = tmp_path / "permissions.json"
    path.write_text("not json", encoding="utf-8")
    assert PermissionPolicy(path).list_rules("/ws/a") == []


def test_policy_routes_list_and_revoke(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    manager = SessionManager()
    client = TestClient(create_app(manager))

    workspace = str(tmp_path / "ws")
    manager.secrets.set_active(provider="openai", model="gpt-4", workspace=workspace)
    manager.policy.allow(workspace, "WriteFile")

    body = client.get("/v1/workspaces/policy").json()
    assert body["workspace"] == workspace
    assert [r["tool"] for r in body["rules"]] == ["WriteFile"]

    assert client.delete("/v1/workspaces/policy/WriteFile").json() == {"ok": True}
    assert client.get("/v1/workspaces/policy").json()["rules"] == []
    assert client.delete("/v1/workspaces/policy/WriteFile").json() == {"ok": False}
