"""Auto-generate API keys via AnyRouter sign-in flow.

When a user signs in with AnyRouter, the PKCE flow returns an inference key
that works immediately. This module wraps that flow as a programmatic path
for "no API key to set up."
"""

from __future__ import annotations

import logging
from typing import Any

from anyworker.anyrouter.oauth import (
    LoginFlow,
    exchange_cli_code,
    DEFAULT_BASE_URL,
)

log = logging.getLogger(__name__)


async def auto_generate_key() -> dict[str, Any]:
    """Run the PKCE login flow and return credentials.

    Returns:
        A dict with ``api_key``, ``user_id``, ``management_key`` (optional).
        The caller is responsible for persisting them.
    """
    flow = LoginFlow()
    authorize_url = flow.start()
    log.info("Open this URL in your browser to sign in:\n%s", authorize_url)
    code = await flow.wait()
    payload = await exchange_cli_code(DEFAULT_BASE_URL, code, flow.verifier)

    management = payload.get("management_key") or {}
    return {
        "api_key": str(payload["key"]),
        "user_id": str(payload.get("user_id", "")),
        "management_key": str(management.get("secret", "")),
        "scopes": list(management.get("scopes", [])),
    }


async def auto_generate_key_url() -> str:
    """Start the PKCE flow and return just the authorize URL.

    The caller opens this URL in a browser. Poll for completion using the
    stored LoginFlow instance.
    """
    flow = LoginFlow()
    return flow.start()
