import os
import stat

from anyworker.providers.secrets import SecretStore


def test_settings_file_is_owner_only(tmp_path):
    store = SecretStore(tmp_path / "settings.json")
    store.set_provider_profile("anyrouter", {"api_key": "sk-ar-v1-secret"})
    mode = stat.S_IMODE(os.stat(store.path).st_mode)
    assert mode == 0o600


def test_permissions_tightened_on_load(tmp_path):
    path = tmp_path / "settings.json"
    path.write_text('{"providers": {}, "active": {}}', encoding="utf-8")
    os.chmod(path, 0o644)
    SecretStore(path)
    assert stat.S_IMODE(os.stat(path).st_mode) == 0o600


def test_cas_env_uses_api_root_not_v1(tmp_path):
    store = SecretStore(tmp_path / "settings.json")
    store.set_provider_profile("anyrouter", {"api_key": "sk-ar-v1-abc"})
    env = store.cas_env("anyrouter")
    assert env["ANTHROPIC_BASE_URL"] == "https://anyrouter.dev/api"
    assert env["ANTHROPIC_API_KEY"] == "sk-ar-v1-abc"
    assert "AnyWorker" in env["ANTHROPIC_CUSTOM_HEADERS"]


def test_cas_env_ignores_stale_v1_base_url(tmp_path):
    store = SecretStore(tmp_path / "settings.json")
    store.set_provider_profile(
        "anyrouter",
        {"api_key": "sk-ar-v1-abc", "base_url": "https://anyrouter.dev/api/v1"},
    )
    assert store.cas_env("anyrouter")["ANTHROPIC_BASE_URL"] == "https://anyrouter.dev/api"


def test_account_key_wins_over_provider_profile(tmp_path):
    store = SecretStore(tmp_path / "settings.json")
    store.set_provider_profile("anyrouter", {"api_key": "sk-ar-v1-manual"})
    store.set_account(
        user_id="user_1",
        api_key="sk-ar-v1-account",
        management_key="ak_1",
        scopes=["write:byok"],
        signed_in_at=1.0,
    )
    assert store.cas_env("anyrouter")["ANTHROPIC_API_KEY"] == "sk-ar-v1-account"

    store.clear_account()
    assert store.get_account() == {}
    assert store.cas_env("anyrouter")["ANTHROPIC_API_KEY"] == "sk-ar-v1-manual"


def test_registry_exposes_default_base_url_and_oauth(tmp_path):
    from anyworker.providers.registry import list_providers

    anyrouter = next(p for p in list_providers() if p["name"] == "anyrouter")
    assert anyrouter["default_base_url"] == "https://anyrouter.dev/api"
    assert anyrouter["recommended_model"] == "anyrouter/cowork"
    assert anyrouter["env_key"] == "ANYROUTER_API_KEY"
    assert anyrouter["auth"] == "oauth"
