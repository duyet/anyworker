"""Loopback PKCE sign-in for AnyRouter accounts.

Port of ``packages/agent/src/auth/login.ts`` from the anyrouter repo. Security
properties preserved verbatim:

  * ``state`` is compared before the authorization code is accepted (CSRF).
  * The loopback server is single-shot and bound to ``127.0.0.1:0``.
  * Three-minute timeout, after which the flow fails and the server closes.
  * An HTML result page is rendered for success *and* failure, so the browser
    tab never dies silently.

Unlike the CLI port, nothing is written to ``~/.anyrouter/config.yaml`` — the
caller persists the credentials into AnyWorker's own settings store.
"""

from __future__ import annotations

import base64
import hashlib
import html
import http.server
import logging
import secrets
import socket
import threading
import time
import urllib.parse
import webbrowser
from dataclasses import dataclass, field
from typing import Any, Optional

log = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://anyrouter.dev/api"

#: Management scopes AnyWorker asks for at consent. The user may decline the
#: management grant entirely; the app then runs read-only.
DESKTOP_BUNDLE: tuple[str, ...] = (
    "inference",
    "read:profile",
    "read:credits",
    "read:llm-keys",
    "write:llm-keys",
    "read:presets",
    "write:presets",
    "read:byok",
    "write:byok",
)

LOGIN_TIMEOUT_SECONDS = 3 * 60


# ---------------------------------------------------------------------------
# PKCE helpers (RFC 7636)
# ---------------------------------------------------------------------------


def base64url(raw: bytes) -> str:
    """Base64url encode without padding."""
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def generate_pkce_pair(verifier: Optional[str] = None) -> tuple[str, str]:
    """Return ``(verifier, challenge)`` — 43-char verifier, S256 challenge."""
    verifier = verifier or base64url(secrets.token_bytes(32))
    challenge = base64url(hashlib.sha256(verifier.encode("ascii")).digest())
    return verifier, challenge


def build_authorize_url(
    *,
    base_url: str,
    challenge: str,
    callback: str,
    state: str,
    tool: str = "anyworker",
    client: str = "AnyWorker",
    management_scopes: tuple[str, ...] = DESKTOP_BUNDLE,
) -> str:
    origin = base_url.rstrip("/")
    if origin.endswith("/api"):
        origin = origin[: -len("/api")]
    params = {
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "callback": callback,
        "state": state,
        "tool": tool,
        "client": client,
    }
    if management_scopes:
        params["management_scopes"] = ",".join(management_scopes)
    return f"{origin}/cli/authorize?" + urllib.parse.urlencode(params)


# ---------------------------------------------------------------------------
# Code exchange
# ---------------------------------------------------------------------------


async def exchange_cli_code(base_url: str, code: str, verifier: str) -> dict[str, Any]:
    """Exchange a PKCE code for credentials.

    Returns ``{key, user_id, management_key?}``. ``management_key`` is absent
    when the user declined the management grant, or when AnyRouter could not
    mint it — the caller must degrade to read-only rather than fail.
    """
    import httpx

    url = base_url.rstrip("/") + "/v1/auth/cli/token"
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            url,
            json={
                "code": code,
                "code_verifier": verifier,
                "code_challenge_method": "S256",
            },
        )
    if res.status_code >= 400:
        raise RuntimeError(f"Could not complete sign-in (exchange failed: {res.status_code}).")
    body = res.json()
    if not body.get("key"):
        raise RuntimeError("Sign-in response did not include an API key.")
    return body


# ---------------------------------------------------------------------------
# Loopback callback page
# ---------------------------------------------------------------------------

_CALLBACK_CSS = """:root{
  color-scheme:light dark;
  --background:oklch(1 0 0);--foreground:oklch(0.145 0 0);
  --card:oklch(1 0 0);--muted:oklch(0.97 0 0);--muted-foreground:oklch(0.556 0 0);
  --border:oklch(0.922 0 0);--primary:oklch(0.555 0.163 48.998);
  --destructive:oklch(0.577 0.245 27.325);--radius:0.625rem;
}
@media (prefers-color-scheme:dark){:root{
  --background:oklch(0.145 0 0);--foreground:oklch(0.985 0 0);
  --card:oklch(0.205 0 0);--muted:oklch(0.269 0 0);--muted-foreground:oklch(0.708 0 0);
  --border:oklch(1 0 0 / 10%);--primary:oklch(0.7 0.15 46.201);
  --destructive:oklch(0.704 0.191 22.216);
}}
*{box-sizing:border-box}
body{margin:0;padding:1.5rem;min-height:100vh;display:flex;align-items:center;
  justify-content:center;background:var(--background);color:var(--foreground);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased}
.card{width:100%;max-width:26rem;padding:2rem;text-align:center;background:var(--card);
  border:1px solid var(--border);border-radius:calc(var(--radius) + 4px)}
.badge{width:3rem;height:3rem;margin:0 auto 1.25rem;display:flex;align-items:center;
  justify-content:center;border-radius:9999px;font-size:1.35rem;line-height:1}
.badge.ok{background:color-mix(in oklch,var(--primary) 12%,transparent);color:var(--primary)}
.badge.bad{background:color-mix(in oklch,var(--destructive) 12%,transparent);
  color:var(--destructive)}
h1{margin:0 0 .5rem;font-size:1.2rem;font-weight:600;letter-spacing:-0.01em}
p{margin:.4rem 0;font-size:.9rem;line-height:1.55;color:var(--muted-foreground)}
.reason{margin-top:1rem;padding:.6rem .75rem;border-radius:var(--radius);
  border:1px solid color-mix(in oklch,var(--destructive) 30%,transparent);
  background:color-mix(in oklch,var(--destructive) 10%,transparent);
  color:var(--destructive);font-size:.8rem;word-break:break-word}
.hint{margin-top:1.5rem;padding-top:1.15rem;border-top:1px solid var(--border);font-size:.82rem}"""


def render_callback_html(error: Optional[str] = None) -> str:
    """The page the browser lands on after the consent screen redirects back."""
    if error:
        title = "Sign-in failed"
        body = (
            '<div class="badge bad">&#10005;</div>'
            "<h1>Sign-in didn't complete</h1>"
            "<p>Nothing was saved. Close this tab, go back to AnyWorker, and try again.</p>"
            f'<p class="reason">{html.escape(error)}</p>'
        )
    else:
        title = "Signed in"
        body = (
            '<div class="badge ok">&#10003;</div>'
            "<h1>Signed in to AnyRouter</h1>"
            "<p>Your account is connected to AnyWorker.</p>"
            '<p class="hint">You can close this tab.</p>'
        )
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{html.escape(title)} &middot; AnyRouter</title>"
        f"<style>{_CALLBACK_CSS}</style></head>"
        f'<body><main class="card">{body}</main></body></html>'
    )


# ---------------------------------------------------------------------------
# Loopback server
# ---------------------------------------------------------------------------


@dataclass
class _Callback:
    """Result slot filled by the loopback handler."""

    code: Optional[str] = None
    error: Optional[str] = None
    done: threading.Event = field(default_factory=threading.Event)


def _make_handler(state: str, result: _Callback) -> type:
    class Handler(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.0"

        def log_message(self, *_args: Any) -> None:  # silence stderr access log
            return

        def _reply(self, status: int, error: Optional[str]) -> None:
            page = render_callback_html(error).encode("utf-8")
            self.send_response(status)
            self.send_header("content-type", "text/html; charset=utf-8")
            self.send_header("content-length", str(len(page)))
            self.end_headers()
            self.wfile.write(page)

        def do_GET(self) -> None:  # noqa: N802 — http.server API
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path != "/callback":
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"Not found")
                return

            got = urllib.parse.parse_qs(parsed.query)
            denied = (got.get("error") or [""])[0]
            if denied:
                self._reply(200, f"Authorization was denied or failed ({denied}).")
                result.error = f"Sign-in was denied or failed ({denied})."
            elif (got.get("state") or [""])[0] != state:
                self._reply(
                    400,
                    "State mismatch — the response didn't match this sign-in attempt.",
                )
                result.error = "Sign-in failed: state mismatch (possible CSRF)."
            elif not (got.get("code") or [""])[0]:
                self._reply(400, "No authorization code was returned in the callback URL.")
                result.error = "Sign-in failed: no authorization code returned."
            else:
                self._reply(200, None)
                result.code = got["code"][0]
            result.done.set()

    return Handler


class LoginFlow:
    """One PKCE sign-in attempt: start the server, then wait for the code.

    ``start()`` binds the loopback server and returns the authorize URL so the
    caller can hand it to the GUI. ``wait()`` blocks until the browser comes
    back (or the timeout expires) and returns the authorization code.
    """

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        management_scopes: tuple[str, ...] = DESKTOP_BUNDLE,
        timeout: float = LOGIN_TIMEOUT_SECONDS,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.management_scopes = management_scopes
        self.timeout = timeout
        self.verifier, self.challenge = generate_pkce_pair()
        self.state = base64url(secrets.token_bytes(16))
        self.authorize_url = ""
        self.port = 0
        self._result = _Callback()
        self._server: Optional[http.server.HTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> str:
        """Bind 127.0.0.1:0, serve the callback, and return the authorize URL."""
        handler = _make_handler(self.state, self._result)
        self._server = http.server.HTTPServer(("127.0.0.1", 0), handler)
        self._server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server.timeout = 1.0  # so handle_request() polls instead of blocking
        port = self.port = self._server.server_address[1]
        self.authorize_url = build_authorize_url(
            base_url=self.base_url,
            challenge=self.challenge,
            callback=f"http://127.0.0.1:{port}/callback",
            state=self.state,
            management_scopes=self.management_scopes,
        )
        # Single-shot: the loop exits as soon as one /callback lands (or the
        # deadline passes), and the socket closes with it.
        self._thread = threading.Thread(target=self._serve_once, daemon=True)
        self._thread.start()
        return self.authorize_url

    def _serve_once(self) -> None:
        server = self._server
        assert server is not None
        deadline = time.monotonic() + self.timeout
        try:
            while not self._result.done.is_set() and time.monotonic() < deadline:
                server.handle_request()  # returns after `server.timeout` if idle
        except Exception:
            log.exception("loopback callback server failed")
            self._result.error = "The sign-in callback server failed."
            self._result.done.set()

    def open_browser(self) -> bool:
        try:
            return webbrowser.open(self.authorize_url)
        except Exception:
            return False

    def wait(self) -> str:
        """Block for the authorization code. Raises on denial/timeout/mismatch."""
        try:
            if not self._result.done.wait(self.timeout):
                raise TimeoutError(
                    "Sign-in timed out. Start again and approve it in your browser."
                )
            if self._result.error:
                raise RuntimeError(self._result.error)
            assert self._result.code
            return self._result.code
        finally:
            self.close()

    def close(self) -> None:
        if self._server is not None:
            try:
                self._server.server_close()
            except Exception:
                pass
            self._server = None
