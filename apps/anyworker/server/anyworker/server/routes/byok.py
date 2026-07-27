"""BYOK provider keys, proxied to AnyRouter.

Plaintext provider keys pass straight through: they are never written to
AnyWorker's disk and never logged. AnyRouter encrypts them at rest.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from anyworker.anyrouter import AnyRouterError
from anyworker.server.manager import SessionManager

from . import deps
from .deps import error_response


class ByokCreateBody(BaseModel):
    provider_id: str
    api_key: str
    label: str | None = None
    base_url: str | None = None
    enabled: bool | None = None
    always_use: bool | None = None
    priority: int | None = None
    weight: int | None = None


class ByokUpdateBody(BaseModel):
    """Everything except the secret — rotating a key means creating a new one."""

    label: str | None = None
    base_url: str | None = None
    enabled: bool | None = None
    always_use: bool | None = None
    priority: int | None = None
    weight: int | None = None


class ByokTestBody(BaseModel):
    provider_id: str
    api_key: str
    base_url: str | None = None


def _body(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(exclude_none=True)


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/byok", tags=["byok"])

    @router.get("/providers")
    async def providers() -> Any:
        try:
            return await deps.client_for(manager).byok_providers()
        except AnyRouterError as exc:
            return error_response(exc)

    @router.get("")
    async def list_keys() -> Any:
        try:
            return await deps.client_for(manager).byok_list()
        except AnyRouterError as exc:
            return error_response(exc)

    @router.post("")
    async def create_key(body: ByokCreateBody) -> Any:
        try:
            return await deps.client_for(manager).byok_create(_body(body))
        except AnyRouterError as exc:
            return error_response(exc)

    @router.patch("/{key_id}")
    async def update_key(key_id: str, body: ByokUpdateBody) -> Any:
        try:
            return await deps.client_for(manager).byok_update(key_id, _body(body))
        except AnyRouterError as exc:
            return error_response(exc)

    @router.delete("/{key_id}")
    async def delete_key(key_id: str) -> Any:
        try:
            return await deps.client_for(manager).byok_delete(key_id)
        except AnyRouterError as exc:
            return error_response(exc)

    @router.post("/test")
    async def test_key(body: ByokTestBody) -> Any:
        try:
            return await deps.client_for(manager).byok_test(_body(body))
        except AnyRouterError as exc:
            return error_response(exc)

    return router
