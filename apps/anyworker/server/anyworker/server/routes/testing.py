"""Prompt testing / evaluation routes.

POST /v1/testing/run       — Run a single test
POST /v1/testing/suite     — Run a test suite
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

from anyworker.server.manager import SessionManager
from anyworker.testing.runner import PromptTest, run_suite

log = logging.getLogger(__name__)


def build_router(manager: SessionManager) -> APIRouter:
    router = APIRouter(prefix="/v1/testing", tags=["testing"])

    @router.post("/suite")
    async def test_suite(body: dict[str, Any]) -> dict[str, Any]:
        tests_raw = body.get("tests", [])
        provider = body.get("provider", "anyrouter")
        model = body.get("model", "anyrouter/cowork")

        tests = [
            PromptTest(
                name=t.get("name", "Unnamed"),
                prompt=t.get("prompt", ""),
                expected=t.get("expected", []),
                eval_mode=t.get("eval_mode", "contains"),
                system_prompt=t.get("system_prompt", ""),
            )
            for t in tests_raw
        ]

        env = manager.secrets.cas_env(provider)
        return await run_suite(tests, provider=provider, model=model, env=env)

    return router
