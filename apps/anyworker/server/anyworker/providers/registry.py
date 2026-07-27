"""Multi-provider descriptors (OpenWorker-inspired, smaller set for MVP)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class ProviderField:
    key: str
    label: str
    secret: bool = False
    required: bool = True
    help: str = ""
    placeholder: str = ""
    default: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "key": self.key,
            "label": self.label,
            "secret": self.secret,
            "required": self.required,
            "help": self.help,
            "placeholder": self.placeholder,
            "default": self.default,
        }


@dataclass(frozen=True)
class ProviderDescriptor:
    name: str
    title: str
    harness: str  # "cas" | "compat"
    needs_key: bool
    fields: list[ProviderField]
    recommended_model: Optional[str] = None
    env_key: Optional[str] = None
    blurb: str = ""
    default_base_url: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "title": self.title,
            "harness": self.harness,
            "needs_key": self.needs_key,
            "fields": [f.to_dict() for f in self.fields],
            "recommended_model": self.recommended_model,
            "env_key": self.env_key,
            "blurb": self.blurb,
        }


def _key_field(env_hint: str = "") -> ProviderField:
    return ProviderField(
        key="api_key",
        label="API key",
        secret=True,
        required=True,
        help=env_hint,
        placeholder="sk-…",
    )


def _base_url_field(default: str = "") -> ProviderField:
    return ProviderField(
        key="base_url",
        label="Base URL",
        secret=False,
        required=False,
        default=default,
        placeholder=default,
    )


PROVIDERS: list[ProviderDescriptor] = [
    ProviderDescriptor(
        name="anthropic",
        title="Anthropic",
        harness="cas",
        needs_key=True,
        fields=[_key_field("Or set ANTHROPIC_API_KEY")],
        recommended_model="claude-sonnet-4-6",
        env_key="ANTHROPIC_API_KEY",
        blurb="Full agent via Claude Agent SDK",
    ),
    ProviderDescriptor(
        name="anyrouter",
        title="AnyRouter",
        harness="cas",
        needs_key=True,
        fields=[
            _key_field("AnyRouter API key"),
            _base_url_field("https://anyrouter.dev/api/v1"),
        ],
        recommended_model="anthropic/claude-sonnet-4-6",
        default_base_url="https://anyrouter.dev/api/v1",
        blurb="Free-tier models + multi-provider routing (CAS when Claude-compatible)",
    ),
    ProviderDescriptor(
        name="openai",
        title="OpenAI",
        harness="compat",
        needs_key=True,
        fields=[_key_field("Or set OPENAI_API_KEY"), _base_url_field("")],
        recommended_model="gpt-4.1",
        env_key="OPENAI_API_KEY",
        blurb="Compat mode — reduced tool set",
    ),
    ProviderDescriptor(
        name="ollama",
        title="Ollama",
        harness="compat",
        needs_key=False,
        fields=[_base_url_field("http://localhost:11434/v1")],
        recommended_model="llama3.2",
        default_base_url="http://localhost:11434/v1",
        blurb="Local OpenAI-compatible models",
    ),
    ProviderDescriptor(
        name="openai_compat",
        title="OpenAI-compatible",
        harness="compat",
        needs_key=True,
        fields=[_key_field(), _base_url_field()],
        recommended_model="",
        blurb="Any OpenAI-compatible gateway",
    ),
]


def list_providers() -> list[dict[str, Any]]:
    return [p.to_dict() for p in PROVIDERS]


def get_provider(name: str) -> Optional[ProviderDescriptor]:
    for p in PROVIDERS:
        if p.name == name:
            return p
    return None
