"""Path B — thin OpenAI-compatible tool loop for non-CAS providers.

This runner speaks the OpenAI Chat Completions API (streaming) and executes
local tools (file readers, search, write, bash) in-process.  It maps every
step to the same ``Event`` wire format the GUI already understands from
``CasRunner``, so the frontend needs no special-casing.

Read-only tools (ReadFile, ReadPdf, ReadXlsx, ReadCsv, ListFiles, Search)
are auto-approved so the loop stays snappy.  WriteFile and Bash go through
the ``approver`` callback — the same one CasRunner uses.
"""

from __future__ import annotations

import json
import logging
import re
import shlex
import subprocess
from collections.abc import AsyncIterator, Awaitable, Callable
from pathlib import Path
from typing import Any, Optional

import httpx

from anyworker.tools.readers import (
    read_csv,
    read_pdf,
    read_text,
    read_xlsx,
)

from .events import Event, EventType
from .prompt import ANYWORKER_COWORK_PROMPT

log = logging.getLogger(__name__)

ApprovalOutcome = str  # "once" | "always_tool" | "deny"
Approver = Callable[[dict[str, Any]], Awaitable[ApprovalOutcome]]

#: Tools that are safe to run without user approval.
_AUTO_APPROVED = frozenset(
    {"ReadFile", "ReadPdf", "ReadXlsx", "ReadCsv", "ListFiles", "Search"}
)

#: Tools that require explicit user approval.
_REQUIRES_APPROVAL = frozenset({"WriteFile", "Bash"})


# ---------------------------------------------------------------------------
# Local tool implementations
# ---------------------------------------------------------------------------


def _resolve(workspace: str, rel_path: str) -> Path:
    """Resolve a workspace-relative path safely (no escape of workspace)."""
    base = Path(workspace).resolve()
    target = (base / rel_path).resolve()
    if not target.is_relative_to(base):
        raise ValueError(f"Path escapes workspace: {rel_path}")
    return target


def _tool_read_file(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    path = args.get("path", "")
    if not path:
        return json.dumps({"ok": False, "error": "path is required"})
    result = read_text(ws, path)
    return json.dumps(result)


def _tool_read_pdf(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    path = args.get("path", "")
    if not path:
        return json.dumps({"ok": False, "error": "path is required"})
    result = read_pdf(ws, path)
    return json.dumps(result)


def _tool_read_xlsx(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    path = args.get("path", "")
    if not path:
        return json.dumps({"ok": False, "error": "path is required"})
    result = read_xlsx(ws, path)
    return json.dumps(result)


def _tool_read_csv(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    path = args.get("path", "")
    if not path:
        return json.dumps({"ok": False, "error": "path is required"})
    result = read_csv(ws, path)
    return json.dumps(result)


def _tool_list_files(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    rel = args.get("path", ".")
    try:
        target = _resolve(ws, rel) if rel and rel != "." else Path(ws).resolve()
    except ValueError as exc:
        return json.dumps({"ok": False, "error": str(exc)})
    if not target.exists():
        return json.dumps({"ok": False, "error": f"path not found: {rel}"})
    if target.is_file():
        return json.dumps(
            {"ok": True, "path": str(target), "type": "file", "size": target.stat().st_size}
        )
    entries = []
    for child in sorted(target.iterdir()):
        entries.append(
            {
                "name": child.name,
                "path": str(child.relative_to(target)),
                "type": "dir" if child.is_dir() else "file",
                "size": child.stat().st_size if child.is_file() else None,
            }
        )
    return json.dumps({"ok": True, "path": str(target), "type": "dir", "entries": entries})


def _tool_search(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    query = args.get("query", "")
    path = args.get("path", ".")
    if not query:
        return json.dumps({"ok": False, "error": "query is required"})
    try:
        target = _resolve(ws, path) if path and path != "." else Path(ws).resolve()
    except ValueError as exc:
        return json.dumps({"ok": False, "error": str(exc)})
    if not target.exists():
        return json.dumps({"ok": False, "error": f"path not found: {path}"})

    pattern = re.compile(re.escape(query), re.IGNORECASE)
    matches: list[dict[str, Any]] = []
    search_root = target if target.is_dir() else target.parent
    for file_path in search_root.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in {
            ".txt", ".md", ".py", ".ts", ".tsx", ".js", ".jsx",
            ".json", ".yaml", ".yml", ".toml", ".csv", ".html", ".css",
        }:
            continue
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for i, line in enumerate(content.splitlines(), 1):
            if pattern.search(line):
                matches.append(
                    {
                        "file": str(file_path.relative_to(search_root)),
                        "line": i,
                        "text": line.strip()[:200],
                    }
                )
                if len(matches) >= 20:
                    break
        if len(matches) >= 20:
            break
    return json.dumps(
        {"ok": True, "query": query, "matches": matches, "count": len(matches)}
    )


def _tool_write_file(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    path = args.get("path", "")
    content = args.get("content", "")
    if not path:
        return json.dumps({"ok": False, "error": "path is required"})
    try:
        target = _resolve(ws, path)
    except ValueError as exc:
        return json.dumps({"ok": False, "error": str(exc)})
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return json.dumps({"ok": True, "path": str(target), "size": target.stat().st_size})


def _tool_bash(args: dict[str, Any]) -> str:
    ws = args.get("workspace", "")
    command = args.get("command", "")
    if not command:
        return json.dumps({"ok": False, "error": "command is required"})
    try:
        result = subprocess.run(
            shlex.split(command),
            cwd=ws,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return json.dumps(
            {
                "ok": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout[:4000],
                "stderr": result.stderr[:4000],
            }
        )
    except Exception as exc:
        return json.dumps({"ok": False, "error": str(exc)})


#: Registry of local tools available in compat mode.
TOOL_REGISTRY: dict[str, Callable[[dict[str, Any]], str]] = {
    "ReadFile": _tool_read_file,
    "ReadPdf": _tool_read_pdf,
    "ReadXlsx": _tool_read_xlsx,
    "ReadCsv": _tool_read_csv,
    "ListFiles": _tool_list_files,
    "Search": _tool_search,
    "WriteFile": _tool_write_file,
    "Bash": _tool_bash,
}

#: OpenAI function-tool schema for each local tool.
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "ReadFile",
            "description": "Read a text file (txt, md, py, json, yaml, etc.) from the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path to the file."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ReadPdf",
            "description": "Extract text content from a PDF file in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path to the PDF."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ReadXlsx",
            "description": "Read tabular data from an XLSX file in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path to the XLSX."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ReadCsv",
            "description": "Parse a CSV file and return rows with headers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path to the CSV."},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ListFiles",
            "description": "List files and directories in a workspace path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path (default: root)."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "Search",
            "description": "Search for text patterns across files in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Text to search for."},
                    "path": {"type": "string", "description": "Workspace-relative path to search in (default: root)."},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "WriteFile",
            "description": "Write content to a file in the workspace. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Workspace-relative path to write."},
                    "content": {"type": "string", "description": "File content to write."},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "Bash",
            "description": "Run a shell command in the workspace. Requires approval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to execute."},
                },
                "required": ["command"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class CompatRunner:
    """Thin OpenAI-compatible tool loop for non-CAS providers (Path B).

    Speaks the OpenAI Chat Completions streaming API, executes local tools
    in-process, and yields the same ``Event`` objects the GUI expects from
    ``CasRunner``.
    """

    def __init__(
        self,
        *,
        session_id: str,
        workspace: str,
        model: Optional[str] = None,
        api_key: str = "",
        base_url: str = "",
        approver: Optional[Approver] = None,
    ) -> None:
        self.session_id = session_id
        self.workspace = workspace
        self.model = model
        self.api_key = api_key
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.approver = approver
        self._client: Optional[httpx.AsyncClient] = None
        self._session_allow_tools: set[str] = set()
        self._interrupted = False

    async def aclose(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                log.exception("CompatRunner client close failed")
            self._client = None

    async def interrupt(self) -> None:
        self._interrupted = True

    # -- tool execution ---------------------------------------------------

    def _inject_workspace(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Inject the workspace into tool args (hidden from the model)."""
        args = dict(args)
        args["workspace"] = self.workspace
        return args

    def _execute_tool(self, name: str, args: dict[str, Any]) -> str:
        func = TOOL_REGISTRY.get(name)
        if func is None:
            return json.dumps({"ok": False, "error": f"Unknown tool: {name}"})
        try:
            return func(self._inject_workspace(name, args))
        except Exception as exc:
            log.exception("Tool %s failed", name)
            return json.dumps({"ok": False, "error": str(exc)})

    # -- main loop --------------------------------------------------------

    async def run_turn(self, prompt: str) -> AsyncIterator[Event]:
        """Run a single turn: send the prompt, handle tool calls, stream text."""
        if not self.api_key:
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={"message": "No API key configured for this provider."},
            )
            yield Event(
                type=EventType.TURN_END,
                session_id=self.session_id,
                payload={"subtype": "error"},
            )
            return

        if not self.base_url:
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={"message": "No base URL configured for this provider."},
            )
            yield Event(
                type=EventType.TURN_END,
                session_id=self.session_id,
                payload={"subtype": "error"},
            )
            return

        yield Event(
            type=EventType.TURN_START,
            session_id=self.session_id,
            payload={},
        )

        headers = {"Authorization": f"Bearer {self.api_key}"}
        chat_url = f"{self.base_url}/v1/chat/completions"

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": ANYWORKER_COWORK_PROMPT},
            {"role": "user", "content": prompt},
        ]

        max_iterations = 20
        iteration = 0

        try:
            if self._interrupted:
                yield Event(
                    type=EventType.TURN_END,
                    session_id=self.session_id,
                    payload={"subtype": "interrupted"},
                )
                return

            self._client = httpx.AsyncClient(timeout=120.0, headers=headers)
            self._interrupted = False

            while iteration < max_iterations and not self._interrupted:
                iteration += 1

                request_body: dict[str, Any] = {
                    "model": self.model,
                    "messages": messages,
                    "tools": TOOL_SCHEMAS,
                    "tool_choice": "auto",
                    "stream": True,
                }

                tool_calls: list[dict[str, Any]] = []
                assistant_text = ""

                async with self._client.stream(
                    "POST", chat_url, json=request_body
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        try:
                            err = json.loads(error_text)
                            msg = err.get("error", {}).get("message", str(error_text))
                        except Exception:
                            msg = str(error_text)
                        yield Event(
                            type=EventType.ERROR,
                            session_id=self.session_id,
                            payload={"message": f"API error: {msg}"},
                        )
                        break

                    async for chunk in response.aiter_lines():
                        if not chunk or not chunk.startswith("data: "):
                            continue
                        data_str = chunk[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        choice = data.get("choices", [{}])[0]
                        delta = choice.get("delta", {})

                        # Text content
                        content = delta.get("content")
                        if content:
                            assistant_text += content
                            yield Event(
                                type=EventType.TEXT_DELTA,
                                session_id=self.session_id,
                                payload={"text": content},
                            )

                        # Tool calls
                        tool_deltas = delta.get("tool_calls") or []
                        for tc_delta in tool_deltas:
                            idx = tc_delta.get("index", 0)
                            while len(tool_calls) <= idx:
                                tool_calls.append(
                                    {"id": None, "name": None, "arguments": ""}
                                )
                            tc = tool_calls[idx]
                            if tc_delta.get("id"):
                                tc["id"] = tc_delta["id"]
                            fn = tc_delta.get("function", {})
                            if fn.get("name"):
                                tc["name"] = fn["name"]
                            if fn.get("arguments"):
                                tc["arguments"] += fn["arguments"]

                if self._interrupted:
                    yield Event(
                        type=EventType.TURN_END,
                        session_id=self.session_id,
                        payload={"subtype": "interrupted"},
                    )
                    break

                # Emit accumulated text as a single TEXT event (for the transcript)
                if assistant_text:
                    yield Event(
                        type=EventType.TEXT,
                        session_id=self.session_id,
                        payload={"text": assistant_text},
                    )

                # Handle tool calls
                if tool_calls:
                    # Emit tool_start events
                    for tc in tool_calls:
                        if tc["name"]:
                            yield Event(
                                type=EventType.TOOL_START,
                                session_id=self.session_id,
                                payload={
                                    "name": tc["name"],
                                    "id": tc["id"],
                                    "input": _safe_json_parse(tc["arguments"]),
                                },
                            )

                    # Execute tools and build results
                    tool_results: list[dict[str, Any]] = []
                    for tc in tool_calls:
                        name = tc["name"]
                        if not name:
                            continue
                        args = _safe_json_parse(tc["arguments"])

                        # Check if the tool requires approval
                        needs_approval = (
                            name in _REQUIRES_APPROVAL
                            and name not in self._session_allow_tools
                        )

                        if needs_approval:
                            # Yield PERMISSION_REQUIRED before calling the approver
                            # (mirrors CasRunner/manager behaviour)
                            yield Event(
                                type=EventType.PERMISSION_REQUIRED,
                                session_id=self.session_id,
                                id=tc["id"],
                                payload={
                                    "tool_name": name,
                                    "arguments": args,
                                    "reason": f"AnyWorker wants to run {name}",
                                },
                            )

                            if self.approver is None:
                                yield Event(
                                    type=EventType.ERROR,
                                    session_id=self.session_id,
                                    payload={
                                        "message": f"Tool {name} requires approval but no approver is wired."
                                    },
                                )
                                yield Event(
                                    type=EventType.TURN_END,
                                    session_id=self.session_id,
                                    payload={"subtype": "denied"},
                                )
                                return

                            request = {
                                "id": tc["id"],
                                "tool_name": name,
                                "arguments": args,
                                "reason": f"AnyWorker wants to run {name}",
                            }
                            outcome = await self.approver(request)
                            if outcome == "always_tool":
                                self._session_allow_tools.add(name)
                            if outcome == "deny":
                                yield Event(
                                    type=EventType.ERROR,
                                    session_id=self.session_id,
                                    payload={
                                        "message": f"Tool {name} was denied by the user."
                                    },
                                )
                                yield Event(
                                    type=EventType.TURN_END,
                                    session_id=self.session_id,
                                    payload={"subtype": "denied"},
                                )
                                return

                        result = self._execute_tool(name, args)
                        tool_results.append(
                            {
                                "tool_call_id": tc["id"],
                                "role": "tool",
                                "content": result,
                            }
                        )

                        yield Event(
                            type=EventType.TOOL_END,
                            session_id=self.session_id,
                            payload={
                                "name": name,
                                "id": tc["id"],
                                "result": result[:500],
                            },
                        )

                    # Append assistant message with tool calls + tool results
                    messages.append(
                        {
                            "role": "assistant",
                            "content": assistant_text or None,
                            "tool_calls": [
                                {
                                    "id": tc["id"],
                                    "type": "function",
                                    "function": {
                                        "name": tc["name"],
                                        "arguments": tc["arguments"],
                                    },
                                }
                                for tc in tool_calls
                                if tc["name"]
                            ],
                        }
                    )
                    messages.extend(tool_results)
                    continue  # loop back for the next model response

                # No tool calls — turn is done
                yield Event(
                    type=EventType.TURN_END,
                    session_id=self.session_id,
                    payload={"subtype": "ok"},
                )
                break

            if self._interrupted:
                yield Event(
                    type=EventType.TURN_END,
                    session_id=self.session_id,
                    payload={"subtype": "interrupted"},
                )
            elif iteration >= max_iterations:
                yield Event(
                    type=EventType.ERROR,
                    session_id=self.session_id,
                    payload={"message": "Reached maximum tool-call iterations."},
                )
                yield Event(
                    type=EventType.TURN_END,
                    session_id=self.session_id,
                    payload={"subtype": "max_iterations"},
                )

        except httpx.HTTPError as exc:
            log.exception("CompatRunner HTTP error")
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={"message": f"Network error: {exc}"},
            )
            yield Event(
                type=EventType.TURN_END,
                session_id=self.session_id,
                payload={"subtype": "error"},
            )
        except Exception as exc:
            log.exception("CompatRunner turn failed")
            yield Event(
                type=EventType.ERROR,
                session_id=self.session_id,
                payload={"message": str(exc)},
            )
            yield Event(
                type=EventType.TURN_END,
                session_id=self.session_id,
                payload={"subtype": "error"},
            )
        finally:
            await self.aclose()


def _safe_json_parse(text: str) -> dict[str, Any]:
    """Parse a JSON string, returning {} on failure."""
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
        return {}
    except (json.JSONDecodeError, TypeError):
        return {}
