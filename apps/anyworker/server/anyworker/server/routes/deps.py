"""Shared helpers for the AnyRouter-backed routers."""

from __future__ import annotations


from fastapi.responses import JSONResponse

from anyworker.anyrouter import AnyRouterClient, AnyRouterError
from anyworker.anyrouter.oauth import DEFAULT_BASE_URL
from anyworker.server.manager import SessionManager


def client_for(manager: SessionManager) -> AnyRouterClient:
    """Client carrying whichever credentials the account block holds.

    Both may be empty: the model catalog and the BYOK provider list work
    unauthenticated, so a signed-out app still gets useful answers.
    """
    account = manager.secrets.get_account()
    return AnyRouterClient(
        api_key=account.get("api_key") or "",
        management_key=account.get("management_key") or "",
        base_url=DEFAULT_BASE_URL,
    )


def error_response(exc: AnyRouterError) -> JSONResponse:
    status = exc.status if 400 <= exc.status < 600 else 502
    return JSONResponse({"error": str(exc)}, status_code=status)

