import pytest

from anyworker.anyrouter.oauth import (
    LoginFlow,
    base64url,
    build_authorize_url,
    generate_pkce_pair,
    render_callback_html,
)


def test_pkce_known_vector():
    # RFC 7636 appendix B: verifier -> S256 challenge.
    verifier, challenge = generate_pkce_pair(
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    )
    assert verifier == "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    assert challenge == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"


def test_generated_verifier_is_43_chars_and_unpadded():
    verifier, challenge = generate_pkce_pair()
    assert len(verifier) == 43
    assert "=" not in verifier and "=" not in challenge
    assert "+" not in challenge and "/" not in challenge


def test_base64url_strips_padding():
    assert base64url(b"\x00") == "AA"


def test_authorize_url_strips_api_suffix_and_carries_scopes():
    url = build_authorize_url(
        base_url="https://anyrouter.dev/api",
        challenge="chal",
        callback="http://127.0.0.1:5555/callback",
        state="st",
        management_scopes=("inference", "write:byok"),
    )
    assert url.startswith("https://anyrouter.dev/cli/authorize?")
    assert "code_challenge=chal" in url
    assert "code_challenge_method=S256" in url
    assert "tool=anyworker" in url
    assert "client=AnyWorker" in url
    assert "management_scopes=inference%2Cwrite%3Abyok" in url


def test_callback_html_renders_both_states():
    ok = render_callback_html()
    assert "Signed in to AnyRouter" in ok
    bad = render_callback_html("boom <script>")
    assert "Sign-in didn't complete" in bad
    assert "&lt;script&gt;" in bad  # escaped, not injected


def _callback(port: int, query: str) -> int:
    import urllib.error
    import urllib.request

    try:
        with urllib.request.urlopen(
            f"http://127.0.0.1:{port}/callback?{query}"
        ) as res:
            return res.status
    except urllib.error.HTTPError as exc:
        return exc.code


def test_state_mismatch_is_rejected():
    flow = LoginFlow(timeout=10)
    flow.start()
    port = flow.port
    assert _callback(port, "state=wrong&code=abc") == 400
    with pytest.raises(RuntimeError, match="state mismatch"):
        flow.wait()


def test_matching_state_yields_the_code():
    flow = LoginFlow(timeout=10)
    flow.start()
    port = flow.port
    assert _callback(port, f"state={flow.state}&code=abc123") == 200
    assert flow.wait() == "abc123"


def test_denied_authorization_fails():
    flow = LoginFlow(timeout=10)
    flow.start()
    port = flow.port
    assert _callback(port, f"state={flow.state}&error=access_denied") == 200
    with pytest.raises(RuntimeError, match="denied"):
        flow.wait()
