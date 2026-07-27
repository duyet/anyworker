#!/usr/bin/env bash
# Build downloadable AnyWorker app artifacts (GUI dist + server wheel).
# Output: dist/app/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/app"
SHA="${GITHUB_SHA:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)}"
VERSION="${APP_VERSION:-$(node -p "require('$ROOT/apps/anyworker/package.json').version")}"

rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> Building GUI (@anyworker/gui)"
cd "$ROOT"
pnpm --filter @anyworker/gui build
(
  cd "$ROOT/apps/anyworker/gui/dist"
  zip -qr "$OUT/anyworker-gui-${VERSION}-${SHA}.zip" .
)

echo "==> Building server wheel"
cd "$ROOT/apps/anyworker/server"
if command -v uv >/dev/null 2>&1; then
  uv build --out-dir "$OUT/server"
else
  python3 -m pip install -q build
  python3 -m build --outdir "$OUT/server"
fi

# Flatten wheel/sdist into OUT root for convenience
if compgen -G "$OUT/server/*" > /dev/null; then
  cp "$OUT/server"/* "$OUT/" 2>/dev/null || true
fi

cat > "$OUT/manifest.json" <<EOF
{
  "name": "anyworker",
  "component": "app",
  "version": "${VERSION}",
  "git_sha": "${SHA}",
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "artifacts": [
    "anyworker-gui-${VERSION}-${SHA}.zip",
    "server (wheel/sdist in this directory)"
  ],
  "notes": "GUI is a browser build of the product UI. Server is the Python anyworker-server package (Claude Agent SDK). Desktop Tauri shell is not packaged yet."
}
EOF

echo "==> Packaged into $OUT"
ls -la "$OUT"
