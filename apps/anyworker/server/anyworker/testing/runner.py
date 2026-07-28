"""Prompt test runner — define expected outcomes and evaluate them.

Usage:
    test = PromptTest(
        name="Research synthesis quality",
        prompt="Summarize the key findings from these documents…",
        expected=["citations", "data points", "action items"],
        eval_mode="contains",   # "contains" | "exact" | "llm_judge"
    )
    result = await run_test(test, provider="anyrouter", model="anyrouter/cowork")
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger(__name__)


@dataclass
class PromptTest:
    """A single prompt test case."""

    name: str
    prompt: str
    expected: list[str]  # strings we expect in the output (eval_mode="contains")
    eval_mode: str = "contains"  # "contains" | "exact" | "regex" | "llm_judge"
    system_prompt: str = ""
    max_turns: int = 5
    timeout_seconds: float = 120.0


@dataclass
class TestResult:
    """Outcome of running one prompt test."""

    name: str
    passed: bool
    score: float  # 0.0 - 1.0
    duration_ms: int
    output: str = ""
    errors: list[str] = field(default_factory=list)
    matches: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)


def _evaluate_contains(output: str, expected: list[str]) -> tuple[list[str], list[str]]:
    """Check which expected strings appear in output (case-insensitive)."""
    lower = output.lower()
    matches = [e for e in expected if e.lower() in lower]
    missing = [e for e in expected if e not in matches]
    return matches, missing


def _evaluate_exact(output: str, expected: list[str]) -> tuple[list[str], list[str]]:
    """Check line-by-line exact matches."""
    lines = output.strip().split("\n")
    matches = [e for e in expected if e.strip() in [line.strip() for line in lines]]
    missing = [e for e in expected if e not in matches]
    return matches, missing


def _evaluate_regex(output: str, expected: list[str]) -> tuple[list[str], list[str]]:
    """Check regex patterns against output."""
    matches = []
    missing = []
    for pattern in expected:
        try:
            if re.search(pattern, output, re.IGNORECASE | re.DOTALL):
                matches.append(pattern)
            else:
                missing.append(pattern)
        except re.error:
            missing.append(pattern)
    return matches, missing


async def run_test(
    test: PromptTest,
    *,
    provider: str = "anyrouter",
    model: str = "anyrouter/cowork",
    env: dict[str, str] | None = None,
) -> TestResult:
    """Run a single prompt test and return the result.

    For now this uses a simple LLM call. In production it would route through
    the CasRunner with a minimal tool set.
    """
    import sys

    if sys.version_info >= (3, 11):
        from anthropic import AsyncAnthropic
    else:
        AsyncAnthropic = None  # defer

    start = time.monotonic()
    errors: list[str] = []
    output = ""

    try:
        from anthropic import AsyncAnthropic

        api_key = (env or {}).get("ANTHROPIC_API_KEY", "")
        base_url = (env or {}).get("ANTHROPIC_BASE_URL", "")

        client_kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url

        client = AsyncAnthropic(**client_kwargs)
        system = test.system_prompt or "You are a helpful assistant."
        messages = [{"role": "user", "content": test.prompt}]

        resp = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=system,
            messages=messages,
        )

        for block in resp.content:
            if hasattr(block, "text"):
                output += block.text

    except Exception as exc:
        errors.append(str(exc))
        log.exception("Test %r failed", test.name)

    duration_ms = int((time.monotonic() - start) * 1000)

    if test.eval_mode == "exact":
        matches, missing = _evaluate_exact(output, test.expected)
    elif test.eval_mode == "regex":
        matches, missing = _evaluate_regex(output, test.expected)
    else:
        matches, missing = _evaluate_contains(output, test.expected)

    total = len(test.expected)
    score = (len(matches) / total) if total > 0 else 0.0
    passed = score >= 0.8 and not errors

    return TestResult(
        name=test.name,
        passed=passed,
        score=score,
        duration_ms=duration_ms,
        output=output[:2000],
        errors=errors,
        matches=matches,
        missing=missing,
    )


async def run_suite(
    tests: list[PromptTest],
    *,
    provider: str = "anyrouter",
    model: str = "anyrouter/cowork",
    env: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Run a suite of tests and return aggregate results."""
    results = [await run_test(t, provider=provider, model=model, env=env) for t in tests]
    passed = sum(1 for r in results if r.passed)
    return {
        "total": len(results),
        "passed": passed,
        "failed": len(results) - passed,
        "avg_score": sum(r.score for r in results) / len(results) if results else 0.0,
        "results": [vars(r) for r in results],
        "generated_at": time.time(),
    }
