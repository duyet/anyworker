"""Plugin discovery, installation, and skill loading."""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path
from typing import Any

from .manifest import PluginManifest

log = logging.getLogger(__name__)

DEFAULT_PLUGIN_DIR = Path.home() / ".anyworker" / "plugins"


class PluginRegistry:
    """Manages installed plugins and skill discovery."""

    def __init__(self, install_dir: Path | None = None) -> None:
        self.install_dir = install_dir or DEFAULT_PLUGIN_DIR

    # -- Discovery -----------------------------------------------------------

    def list_plugins(self) -> list[PluginManifest]:
        """Return all discovered plugins with valid manifests."""
        return PluginManifest.discover(self.install_dir)

    def get_plugin(self, name: str) -> PluginManifest | None:
        """Return a specific plugin by name, or None."""
        for p in self.list_plugins():
            if p.name == name:
                return p
        return None

    # -- Installation --------------------------------------------------------

    def install_plugin(self, url: str, name: str | None = None) -> PluginManifest:
        """Clone a git repo into the plugin directory and discover its manifest."""
        dest = self.install_dir / (name or url.split("/")[-1].replace(".git", ""))
        dest.parent.mkdir(parents=True, exist_ok=True)

        if dest.exists():
            shutil.rmtree(dest)

        log.info("Cloning plugin repo %s into %s", url, dest)
        subprocess.run(
            ["git", "clone", "--depth", "1", url, str(dest)],
            check=True,
            capture_output=True,
            text=True,
        )

        manifests = PluginManifest.discover(self.install_dir)
        for m in manifests:
            if m.install_path == dest or m.name == (name or m.name):
                return m

        raise PluginError(f"Plugin {name or url} has no valid plugin.json manifest")

    def uninstall_plugin(self, name: str) -> bool:
        """Remove a plugin directory by name."""
        plugin = self.get_plugin(name)
        if plugin is None or plugin.install_path is None:
            return False
        if plugin.install_path.exists():
            shutil.rmtree(plugin.install_path)
        return True

    # -- Skill lookup --------------------------------------------------------

    def load_skill(self, name: str) -> dict[str, Any] | None:
        """Find a skill by name across all installed plugins."""
        for plugin in self.list_plugins():
            if name in plugin.skills:
                return {
                    "name": name,
                    "plugin": plugin.name,
                    "version": plugin.version,
                    "description": plugin.description,
                }
        return None


class PluginError(Exception):
    """Raised when a plugin operation fails."""
