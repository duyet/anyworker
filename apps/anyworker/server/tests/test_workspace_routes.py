"""Tests for the read-only workspace file API."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager
from anyworker.server.routes import workspace as workspace_routes


@pytest.fixture
def workspace(tmp_path: Path) -> Path:
    ws = tmp_path / "ws"
    ws.mkdir()
    return ws


@pytest.fixture
def client(
    tmp_path: Path, workspace: Path, monkeypatch: pytest.MonkeyPatch
) -> TestClient:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path / "state"))
    manager = SessionManager()
    manager.secrets.set_active(
        provider="openai", model="gpt-4", workspace=str(workspace)
    )
    return TestClient(create_app(manager))


def test_tree_lists_files_and_dirs(client: TestClient, workspace: Path) -> None:
    (workspace / "notes.txt").write_text("hello", encoding="utf-8")
    (workspace / "sub").mkdir()

    body = client.get("/v1/workspace/tree").json()
    entries = {e["name"]: e for e in body["entries"]}
    assert entries["notes.txt"]["kind"] == "file"
    assert entries["notes.txt"]["size"] == 5
    assert entries["notes.txt"]["modified"] > 0
    assert entries["sub"]["kind"] == "dir"
    assert "children" not in entries["sub"]


def test_tree_skips_noise_directories(client: TestClient, workspace: Path) -> None:
    for name in (".git", "node_modules", "__pycache__", ".venv"):
        (workspace / name).mkdir()
    (workspace / "keep").mkdir()

    names = {e["name"] for e in client.get("/v1/workspace/tree").json()["entries"]}
    assert names == {"keep"}


def test_tree_depth_is_capped(client: TestClient, workspace: Path) -> None:
    deep = workspace
    for i in range(8):
        deep = deep / f"d{i}"
        deep.mkdir()

    body = client.get("/v1/workspace/tree?depth=99").json()
    assert body["depth"] == workspace_routes.MAX_DEPTH

    node = body["entries"][0]
    levels = 1
    while node.get("children"):
        node = node["children"][0]
        levels += 1
    assert levels == workspace_routes.MAX_DEPTH


def test_tree_rejects_traversal(client: TestClient) -> None:
    resp = client.get("/v1/workspace/tree?path=../..")
    assert resp.status_code == 400
    assert "escapes" in resp.json()["error"]


def test_tree_omits_symlinks_pointing_out(
    client: TestClient, workspace: Path, tmp_path: Path
) -> None:
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "secret.txt").write_text("nope", encoding="utf-8")
    (workspace / "link").symlink_to(outside)

    names = {e["name"] for e in client.get("/v1/workspace/tree").json()["entries"]}
    assert "link" not in names


def test_file_reads_text(client: TestClient, workspace: Path) -> None:
    (workspace / "notes.txt").write_text("hello world", encoding="utf-8")
    body = client.get("/v1/workspace/file?path=notes.txt").json()
    assert body["ok"] is True
    assert body["content"] == "hello world"
    assert body["path"] == "notes.txt"


def test_file_rejects_relative_traversal(client: TestClient) -> None:
    resp = client.get("/v1/workspace/file?path=../../etc/passwd")
    assert resp.status_code == 400
    assert "escapes" in resp.json()["error"]


def test_file_rejects_absolute_path(client: TestClient) -> None:
    assert client.get("/v1/workspace/file?path=/etc/passwd").status_code == 400


def test_file_rejects_symlink_out(
    client: TestClient, workspace: Path, tmp_path: Path
) -> None:
    secret = tmp_path / "secret.txt"
    secret.write_text("nope", encoding="utf-8")
    (workspace / "link.txt").symlink_to(secret)

    resp = client.get("/v1/workspace/file?path=link.txt")
    assert resp.status_code == 400
    assert "escapes" in resp.json()["error"]


def test_file_reports_binary_without_bytes(
    client: TestClient, workspace: Path
) -> None:
    (workspace / "blob.bin").write_bytes(b"\x00\x01\x02binary")
    body = client.get("/v1/workspace/file?path=blob.bin").json()
    assert body["ok"] is False
    assert body["reason"] == "file is binary"
    assert body["size"] == 9
    assert "content" not in body


def test_file_reports_oversized_without_bytes(
    client: TestClient, workspace: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(workspace_routes, "MAX_FILE_BYTES", 10)
    (workspace / "big.txt").write_text("x" * 100, encoding="utf-8")

    body = client.get("/v1/workspace/file?path=big.txt").json()
    assert body["ok"] is False
    assert "larger than" in body["reason"]
    assert "content" not in body


def test_file_missing_is_404(client: TestClient) -> None:
    assert client.get("/v1/workspace/file?path=nope.txt").status_code == 404


def test_file_previews_csv(client: TestClient, workspace: Path) -> None:
    with (workspace / "rows.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["name", "qty"])
        writer.writerow(["apples", "3"])

    body = client.get("/v1/workspace/file?path=rows.csv").json()
    assert body["ok"] is True
    assert body["headers"] == ["name", "qty"]
    assert body["rows"][0] == {"name": "apples", "qty": "3"}


def test_file_previews_xlsx(client: TestClient, workspace: Path) -> None:
    openpyxl = pytest.importorskip("openpyxl")
    book = openpyxl.Workbook()
    book.active.append(["name", "qty"])
    book.active.append(["apples", 3])
    book.save(workspace / "sheet.xlsx")

    body = client.get("/v1/workspace/file?path=sheet.xlsx").json()
    assert body["ok"] is True
    sheet = next(iter(body["sheets"].values()))
    assert sheet["headers"] == ["name", "qty"]
    assert sheet["rows"][0] == ["apples", "3"]


def test_file_previews_pdf(client: TestClient, workspace: Path) -> None:
    pymupdf = pytest.importorskip("pymupdf")
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Quarterly memo")
    doc.save(workspace / "memo.pdf")
    doc.close()

    body = client.get("/v1/workspace/file?path=memo.pdf").json()
    assert body["ok"] is True
    assert "Quarterly memo" in body["content"]


def test_no_active_workspace_is_400(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path / "empty"))
    unset = TestClient(create_app(SessionManager()))
    assert unset.get("/v1/workspace/tree").status_code == 400
