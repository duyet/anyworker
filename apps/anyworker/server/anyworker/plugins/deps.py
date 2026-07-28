"""Shared dependency helpers for the plugins package."""

from __future__ import annotations

from fastapi.responses import JSONResponse


def error_response(exc: Exception) -> JSONResponse:
    return JSONResponse({"error": str(exc)}, status_code=400)
