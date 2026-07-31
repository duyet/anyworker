"""Read-only workspace file API — list and preview what the agent touched.

Every path resolves against the active workspace and must stay inside it.
Resolution follows symlinks, so a link pointing outside the workspace is
rejected like any other escape. Nothing here writes.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from anyworker.server.manager import SessionManager
from anyworker.tools.readers import read_csv, read_pdf, read_text, read_xlsx

log = logging.getLogger(__name__)

#: Never listed — noise, and huge.
SKIP_DIRS = frozenset({".git", "node_modules", "__pycache__", ".venv"})

#: Deepest tree a single request may walk.
MAX_DEPTH = 5

#: Largest file we will return content for.
MAX_FILE_BYTES = 2 * 1024 * 1024

#: Bytes sniffed to decide whether a file is binary.
SNIFF_BYTES = 4096


def _active_workspace(manager: SessionManager) -> str:
    return (manager.secrets.get_active().get("workspace") or "").strip()


def _resolve(workspace: str, rel_path: str) -> Path:
    """Resolve a workspace-relative path safely (no escape of workspace)."""
    base = Path(workspace).resolve()
    target = (base / rel_path).resolve()
    if not target.is_relative_to(base):
        raise ValueError(f"Path escapes workspace: {rel_path}")
    return target


def _entry(path: Path, base: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "name": path.name,
        "path": str(path.relative_to(base)),
        "kind": "dir" if path.is_dir() else "file",
        "size": stat.st_size,
        "modified": stat.st_mtime,
    }


def _walk(directory: Path, base: Path, depth: int) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for child in sorted(directory.iterdir(), key=lambda p: p.name.lower()):
        if child.name in SKIP_DIRS:
            continue
        try:
            resolved = child.resolve()
            if not resolved.is_relative_to(base):
                # A symlink out of the workspace. Not ours to show.
                continue
            entry = _entry(resolved, base)
        except OSError:
            continue
        if entry["kind"] == "dir" and depth > 1:
            entry["children"] = _walk(resolved, base, depth - 1)
        entries.append(entry)
    return entries


def _is_binary(path: Path) -> bool:
    try:
        with path.open("rb") as fh:
            return b"\0" in fh.read(SNIFF_BYTES)
    except OSError:
        return True


def _preview(workspace: str, path: Path, base: Path) -> dict[str, Any]:
    rel = str(path.relative_to(base))
    ext = path.suffix.lower()
    if ext == ".pdf":
        return read_pdf(workspace, rel)
    if ext in {".xlsx", ".xls"}:
        return read_xlsx(workspace, rel)
    if ext == ".csv":
        return read_csv(workspace, rel)
    return read_text(workspace, rel)


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/workspace", tags=["workspace"])

    @router.get("/tree")
    async def tree(path: str = ".", depth: int = 1) -> Any:
        workspace = _active_workspace(manager)
        if not workspace:
            return JSONResponse({"error": "no active workspace"}, status_code=400)
        try:
            target = _resolve(workspace, path)
        except ValueError as exc:
            return JSONResponse({"error": str(exc)}, status_code=400)
        if not target.is_dir():
            return JSONResponse({"error": "not a directory"}, status_code=404)
        base = Path(workspace).resolve()
        return {
            "workspace": str(base),
            "path": str(target.relative_to(base)),
            "depth": max(1, min(depth, MAX_DEPTH)),
            "entries": _walk(target, base, max(1, min(depth, MAX_DEPTH))),
        }

    @router.get("/file")
    async def file(path: str) -> Any:
        workspace = _active_workspace(manager)
        if not workspace:
            return JSONResponse({"error": "no active workspace"}, status_code=400)
        try:
            target = _resolve(workspace, path)
        except ValueError as exc:
            return JSONResponse({"error": str(exc)}, status_code=400)
        if not target.is_file():
            return JSONResponse({"error": "file not found"}, status_code=404)

        base = Path(workspace).resolve()
        size = target.stat().st_size
        meta: dict[str, Any] = {
            "path": str(target.relative_to(base)),
            "size": size,
            "modified": target.stat().st_mtime,
        }
        if size > MAX_FILE_BYTES:
            return {
                **meta,
                "ok": False,
                "reason": f"file is larger than {MAX_FILE_BYTES} bytes",
            }
        if target.suffix.lower() not in {".pdf", ".xlsx", ".xls"} and _is_binary(
            target
        ):
            return {**meta, "ok": False, "reason": "file is binary"}

        result = _preview(workspace, target, base)
        # Readers report an absolute `path`; keep the workspace-relative one.
        return {**result, **meta}

    return router


__all__ = ["build_router"]
