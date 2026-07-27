"""Route tests with the AnyRouter client faked — no network."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from anyworker.anyrouter import AnyRouterError
from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


class FakeClient:
    def __init__(self, **overrides: Any) -> None:
        self.calls: list[tuple[str, Any]] = []
        self.overrides = overrides

    def _result(self, name: str, default: Any, arg: Any = None) -> Any:
        self.calls.append((name, arg))
        value = self.overrides.get(name, default)
        if isinstance(value, Exception):
            raise value
        return value

    async def models(self):
        return self._result(
            "models",
            {
                "data": [
                    {"id": "anyrouter/cowork", "name": "AnyRouter Cowork"},
                    {"id": "anthropic/claude-sonnet-4.6", "name": "Sonnet"},
                ]
            },
        )

    async def top_models(self, period: str = "week"):
        return self._result(
            "top_models",
            {"data": [{"model": "anthropic/claude-sonnet-4.6", "requests": 42}]},
        )

    async def presets(self):
        return self._result("presets", {"data": []})

    async def credits(self):
        return self._result("credits", {"balance": 5.0})

    async def profile(self):
        return self._result("profile", {"email": "a@b.c"})

    async def byok_providers(self):
        return self._result("byok_providers", {"providers": [{"id": "openai"}]})

    async def byok_list(self):
        return self._result("byok_list", {"providers": []})

    async def byok_create(self, body):
        return self._result("byok_create", {"id": "k1"}, body)

    async def byok_update(self, key_id, body):
        return self._result("byok_update", {"id": key_id}, body)

    async def byok_delete(self, key_id):
        return self._result("byok_delete", {"ok": True}, key_id)

    async def byok_test(self, body):
        return self._result("byok_test", {"state": "valid"}, body)


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    fake = FakeClient()
    monkeypatch.setattr(
        "anyworker.server.routes.deps.client_for", lambda _manager: fake
    )
    app = create_app(SessionManager())
    with TestClient(app) as test_client:
        test_client.fake = fake
        yield test_client


def test_models_merges_recommended_and_top(client):
    body = client.get("/v1/models").json()
    assert [m["id"] for m in body["recommended"]] == ["anyrouter/cowork"]
    assert body["top"][0]["id"] == "anthropic/claude-sonnet-4.6"
    assert body["top"][0]["requests"] == 42
    assert len(body["models"]) == 2


def test_models_are_cached(client):
    client.get("/v1/models")
    client.get("/v1/models")
    assert [c[0] for c in client.fake.calls].count("models") == 1


def test_models_degrade_when_top_models_fail(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    fake = FakeClient(top_models=AnyRouterError("nope", status=500))
    monkeypatch.setattr(
        "anyworker.server.routes.deps.client_for", lambda _manager: fake
    )
    with TestClient(create_app(SessionManager())) as test_client:
        body = test_client.get("/v1/models").json()
    assert body["top"] == []
    assert len(body["models"]) == 2


def test_byok_providers_passthrough(client):
    assert client.get("/v1/byok/providers").json() == {"providers": [{"id": "openai"}]}


def test_byok_crud_proxies_without_persisting_the_secret(client, tmp_path):
    res = client.post(
        "/v1/byok", json={"provider_id": "openai", "api_key": "sk-plain-secret"}
    )
    assert res.status_code == 200
    sent = dict(client.fake.calls)["byok_create"]
    assert sent["api_key"] == "sk-plain-secret"

    settings = (tmp_path / "settings.json").read_text() if (tmp_path / "settings.json").exists() else ""
    assert "sk-plain-secret" not in settings

    assert client.patch("/v1/byok/k1", json={"enabled": False}).status_code == 200
    assert client.delete("/v1/byok/k1").status_code == 200
    assert (
        client.post(
            "/v1/byok/test", json={"provider_id": "openai", "api_key": "sk-x"}
        ).json()["state"]
        == "valid"
    )


def test_byok_without_management_key_returns_403(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    fake = FakeClient(byok_list=AnyRouterError("needs permissions", status=403))
    monkeypatch.setattr(
        "anyworker.server.routes.deps.client_for", lambda _manager: fake
    )
    with TestClient(create_app(SessionManager())) as test_client:
        res = test_client.get("/v1/byok")
    assert res.status_code == 403
    assert "permissions" in res.json()["error"]


def test_account_reports_signed_out(client):
    assert client.get("/v1/auth/anyrouter/account").json() == {"signed_in": False}


def test_account_reports_signed_in_and_signout_clears(tmp_path, monkeypatch):
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    fake = FakeClient()
    monkeypatch.setattr(
        "anyworker.server.routes.deps.client_for", lambda _manager: fake
    )
    manager = SessionManager()
    manager.secrets.set_account(
        user_id="user_1",
        api_key="sk-ar-v1-x",
        management_key="ak_1",
        scopes=["write:byok"],
        signed_in_at=1.0,
    )
    with TestClient(create_app(manager)) as test_client:
        body = test_client.get("/v1/auth/anyrouter/account").json()
        assert body["signed_in"] is True
        assert body["user_id"] == "user_1"
        assert body["has_management_key"] is True
        assert body["credits"] == {"balance": 5.0}
        assert body["profile"] == {"email": "a@b.c"}

        assert test_client.post("/v1/auth/anyrouter/signout").json() == {"ok": True}
        assert test_client.get("/v1/auth/anyrouter/account").json() == {
            "signed_in": False
        }


def test_status_of_unknown_request_is_404(client):
    assert client.get("/v1/auth/anyrouter/status/nope").status_code == 404
