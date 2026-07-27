from fastapi.testclient import TestClient

from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


def test_health_ok(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    app = create_app(SessionManager())
    client = TestClient(app)
    res = client.get("/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["product"] == "anyworker"


def test_providers_list(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    app = create_app(SessionManager())
    client = TestClient(app)
    res = client.get("/v1/providers")
    assert res.status_code == 200
    names = {p["name"] for p in res.json()["providers"]}
    assert "anthropic" in names
    assert "anyrouter" in names


def test_create_session(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    app = create_app(SessionManager())
    client = TestClient(app)
    res = client.post(
        "/v1/sessions",
        json={"workspace": str(tmp_path), "title": "t"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["id"]
    assert body["workspace"] == str(tmp_path)
