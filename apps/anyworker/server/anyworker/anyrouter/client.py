"""Thin httpx wrapper over the AnyRouter API.

Two credentials, two planes:

  * ``api_key`` (``sk-ar-…``) — the inference key. Reads the public catalog and
    the signed-in profile.
  * ``management_key`` (``ak_…``) — Clerk-issued, scoped. Required for BYOK and
    preset writes. May be ``None`` when the user declined that grant at consent;
    every management call then fails with a clear error instead of a 403 blob.

Attribution headers ride on every request so AnyRouter can attribute traffic.
"""

from __future__ import annotations

from typing import Any, Optional

import httpx

from anyworker import __version__

from .oauth import DEFAULT_BASE_URL

ATTRIBUTION_HEADERS = {
    "X-AnyRouter-Title": "AnyWorker",
    "X-AnyRouter-Source": "anyworker",
    "X-AnyRouter-Version": __version__,
}

_NO_MANAGEMENT_KEY = (
    "This needs the management permissions you declined at sign-in. "
    "Sign in again and approve them."
)


class AnyRouterError(RuntimeError):
    """An AnyRouter API call failed. `status` is 0 for transport errors."""

    def __init__(self, message: str, status: int = 0) -> None:
        super().__init__(message)
        self.status = status


class AnyRouterClient:
    def __init__(
        self,
        *,
        api_key: str = "",
        management_key: str = "",
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 20.0,
    ) -> None:
        self.api_key = api_key
        self.management_key = management_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    # -- plumbing ----------------------------------------------------------

    def _headers(self, *, management: bool) -> dict[str, str]:
        headers = dict(ATTRIBUTION_HEADERS)
        token = self.management_key if management else self.api_key
        if management and not token:
            raise AnyRouterError(_NO_MANAGEMENT_KEY, status=403)
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        management: bool = False,
        params: Optional[dict[str, Any]] = None,
        json: Optional[dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}/v1{path}"
        headers = self._headers(management=management)
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.request(
                    method, url, headers=headers, params=params, json=json
                )
        except httpx.HTTPError as exc:
            raise AnyRouterError(f"Could not reach AnyRouter: {exc}") from exc

        if res.status_code >= 400:
            # Never echo the request body back — BYOK calls carry plaintext keys.
            raise AnyRouterError(_error_message(res), status=res.status_code)
        if not res.content:
            return {}
        try:
            return res.json()
        except ValueError as exc:
            raise AnyRouterError("AnyRouter returned a malformed response") from exc

    # -- catalog (public / inference key) ----------------------------------

    async def models(self) -> Any:
        return await self._request("GET", "/models")

    async def top_models(self, period: str = "week") -> Any:
        return await self._request(
            "GET", "/analytics/top-models", params={"period": period}
        )

    async def presets(self) -> Any:
        return await self._request("GET", "/presets", management=True)

    async def credits(self) -> Any:
        # /credits and /me both accept an sk-ar- inference key, so they work
        # even when the user declined the management grant.
        return await self._request("GET", "/credits")

    async def profile(self) -> Any:
        return await self._request("GET", "/me")

    async def byok_providers(self) -> Any:
        return await self._request("GET", "/byok/providers")

    # -- BYOK (management key) ---------------------------------------------

    async def byok_list(self) -> Any:
        return await self._request("GET", "/auth/byok", management=True)

    async def byok_create(self, body: dict[str, Any]) -> Any:
        return await self._request("POST", "/auth/byok", management=True, json=body)

    async def byok_update(self, key_id: str, body: dict[str, Any]) -> Any:
        return await self._request(
            "PATCH", f"/auth/byok/keys/{key_id}", management=True, json=body
        )

    async def byok_delete(self, key_id: str) -> Any:
        return await self._request(
            "DELETE", f"/auth/byok/keys/{key_id}", management=True
        )

    async def byok_test(self, body: dict[str, Any]) -> Any:
        return await self._request(
            "POST", "/byok/test-key", management=True, json=body
        )


def _error_message(res: httpx.Response) -> str:
    try:
        payload = res.json()
    except ValueError:
        return f"AnyRouter returned {res.status_code}"
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])
        for field in ("message", "error"):
            if isinstance(payload.get(field), str):
                return payload[field]
    return f"AnyRouter returned {res.status_code}"
