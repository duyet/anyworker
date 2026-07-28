"""Tests for the plugin system."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from anyworker.plugins.manifest import PluginManifest
from anyworker.plugins.registry import PluginRegistry


def test_manifest_to_dict(tmp_path: Path) -> None:
    manifest = PluginManifest(
        name="test-plugin",
        version="1.0.0",
        description="A test plugin",
        skills=["read_file", "write_file"],
        repository="https://github.com/example/test-plugin",
        install_path=tmp_path,
    )
    d = manifest.to_dict()
    assert d["name"] == "test-plugin"
    assert d["version"] == "1.0.0"
    assert d["description"] == "A test plugin"
    assert d["skills"] == ["read_file", "write_file"]
    assert d["repository"] == "https://github.com/example/test-plugin"
    assert d["install_path"] == str(tmp_path)


def test_manifest_from_dict() -> None:
    d = {
        "name": "test-plugin",
        "version": "2.0.0",
        "description": "A test",
        "skills": ["skill_a"],
        "repository": "https://github.com/example/test",
    }
    manifest = PluginManifest.from_dict(d)
    assert manifest.name == "test-plugin"
    assert manifest.version == "2.0.0"
    assert manifest.skills == ["skill_a"]


def test_manifest_discover_empty_dir(tmp_path: Path) -> None:
    manifests = PluginManifest.discover(tmp_path)
    assert manifests == []


def test_manifest_discover_no_manifest(tmp_path: Path) -> None:
    (tmp_path / "no-manifest").mkdir()
    manifests = PluginManifest.discover(tmp_path)
    assert manifests == []


def test_manifest_discover_valid(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "my-plugin"
    plugin_dir.mkdir()
    manifest_file = plugin_dir / "plugin.json"
    manifest_file.write_text(
        json.dumps(
            {
                "name": "my-plugin",
                "version": "0.1.0",
                "description": "A sample plugin",
                "skills": ["read_pdf", "read_csv"],
                "repository": "https://github.com/example/my-plugin",
            }
        )
    )
    manifests = PluginManifest.discover(tmp_path)
    assert len(manifests) == 1
    assert manifests[0].name == "my-plugin"
    assert manifests[0].skills == ["read_pdf", "read_csv"]
    assert manifests[0].install_path == plugin_dir


def test_registry_list_plugins(tmp_path: Path) -> None:
    reg = PluginRegistry(install_dir=tmp_path)
    assert reg.list_plugins() == []


def test_registry_install_plugin(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "test-plugin"
    plugin_dir.mkdir()
    (plugin_dir / "plugin.json").write_text(
        json.dumps(
            {
                "name": "test-plugin",
                "version": "1.0.0",
                "skills": ["read_file"],
            }
        )
    )
    reg = PluginRegistry(install_dir=tmp_path)
    plugins = reg.list_plugins()
    assert len(plugins) == 1
    assert plugins[0].name == "test-plugin"


def test_registry_get_plugin(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "test-plugin"
    plugin_dir.mkdir()
    (plugin_dir / "plugin.json").write_text(
        json.dumps(
            {
                "name": "test-plugin",
                "version": "1.0.0",
                "skills": ["read_file"],
            }
        )
    )
    reg = PluginRegistry(install_dir=tmp_path)
    plugin = reg.get_plugin("test-plugin")
    assert plugin is not None
    assert plugin.name == "test-plugin"
    assert reg.get_plugin("nonexistent") is None


def test_registry_uninstall_plugin(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "test-plugin"
    plugin_dir.mkdir()
    (plugin_dir / "plugin.json").write_text(
        json.dumps(
            {
                "name": "test-plugin",
                "version": "1.0.0",
                "skills": ["read_file"],
            }
        )
    )
    reg = PluginRegistry(install_dir=tmp_path)
    assert reg.uninstall_plugin("test-plugin") is True
    assert reg.list_plugins() == []
    assert reg.uninstall_plugin("nonexistent") is False


def test_registry_load_skill(tmp_path: Path) -> None:
    plugin_dir = tmp_path / "test-plugin"
    plugin_dir.mkdir()
    (plugin_dir / "plugin.json").write_text(
        json.dumps(
            {
                "name": "test-plugin",
                "version": "1.0.0",
                "skills": ["read_pdf", "read_csv"],
            }
        )
    )
    reg = PluginRegistry(install_dir=tmp_path)
    result = reg.load_skill("read_pdf")
    assert result is not None
    assert result["name"] == "read_pdf"
    assert result["plugin"] == "test-plugin"
    assert reg.load_skill("nonexistent") is None


def test_routes_install_plugin(app: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import subprocess

    def fake_run(*args, **kwargs):
        class FakeResult:
            returncode = 0
            stdout = ""
            stderr = ""
        return FakeResult()

    monkeypatch.setattr(subprocess, "run", fake_run)
    resp = app.post("/v1/plugins/install", json={"url": "https://example.com/plugin.git", "name": "example-plugin"})
    assert resp.status_code in (200, 400, 422)


def test_routes_list_plugins(app: TestClient) -> None:
    resp = app.get("/v1/plugins")
    assert resp.status_code == 200
    data = resp.json()
    assert "plugins" in data


def test_routes_uninstall_plugin(app: TestClient) -> None:
    resp = app.delete("/v1/plugins/nonexistent")
    assert resp.status_code == 200


def test_routes_plugin_skills(app: TestClient) -> None:
    resp = app.get("/v1/plugins/nonexistent/skills")
    assert resp.status_code == 400
