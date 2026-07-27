"""Wire events shared by CAS and compat harnesses → GUI."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    STATUS = "status"
    TEXT_DELTA = "text_delta"
    TEXT = "text"
    TOOL_START = "tool_start"
    TOOL_END = "tool_end"
    PERMISSION_REQUIRED = "permission_required"
    TURN_START = "turn_start"
    TURN_END = "turn_end"
    ERROR = "error"
    SESSION = "session"
    TODO_UPDATE = "todo_update"


class Event(BaseModel):
    type: EventType
    session_id: str
    payload: dict[str, Any] = Field(default_factory=dict)
    id: Optional[str] = None
