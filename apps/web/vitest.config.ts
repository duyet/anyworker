import path from "node:path"
import { defineConfig } from "vitest/config"

// Isolated from vite.config.ts so tests do not load @cloudflare/vite-plugin.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
})
