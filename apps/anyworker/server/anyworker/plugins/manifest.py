"""Plugin manifest definition for AnyWorker skills plugins."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class PluginManifest:
    """Describes a skills plugin that can be installed from a git repository."""

    name: str
    version: str
    description: str = ""
    skills: list[str] = field(default_factory=list)
    repository: str = ""
    install_path: Path | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "skills": self.skills,
            "repository": self.repository,
            "install_path": str(self.install_path) if self.install_path else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, object]) -> PluginManifest:
        return cls(
            name=str(data.get("name", "")),
            version=str(data.get("version", "0.0.0")),
            description=str(data.get("description", "")),
            skills=data.get("skills") or [],
            repository=str(data.get("repository", "")),
        )

    @staticmethod
    def discover(install_dir: Path) -> list[PluginManifest]:
        """Discover all plugins with plugin.json manifests in install_dir."""
        manifests: list[PluginManifest] = []
        if not install_dir.exists():
            return manifests
        for subdir in sorted(install_dir.iterdir()):
            if not subdir.is_dir():
                continue
            manifest_file = subdir / "plugin.json"
            if not manifest_file.exists():
                continue
            try:
                import json

                data = json.loads(manifest_file.read_text())
                # Normalize string fields from JSON
                data.setdefault("skills", [])
                data.setdefault("description", "")
                data.setdefault("repository", "")
                data.setdefault("version", "0.0.0")
                manifest = PluginManifest(
                    name=str(data.get("name", subdir.name)),
                    version=str(data.get("version", "0.0.0")),
                    description=str(data.get("description", "")),
                    skills=list(data.get("skills") or []),
                    repository=str(data.get("repository", "")),
                    install_path=subdir,
                )
                manifests.append(manifest)
            except (json.JSONDecodeError, OSError):
                continue
        return manifests