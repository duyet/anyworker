"""Shared pytest fixtures for AnyWorker server tests."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from anyworker.server.app import create_app
from anyworker.server.manager import SessionManager


@pytest.fixture
def app(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("ANYWORKER_STATE_DIR", str(tmp_path))
    return TestClient(create_app(SessionManager()))


@pytest.fixture
def client(app: TestClient) -> TestClient:
    return app
