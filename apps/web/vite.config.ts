import { defineConfig } from "vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // Runs the SSR environment on workerd locally, so `pnpm dev` exercises the
    // same runtime production does. This is the current path — the older nitro
    // `cloudflare-module` preset is superseded.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    // Every route prerenders to static HTML at build time. The landing page has
    // no per-request data, so at runtime the worker only serves /api/*.
    tanstackStart({ prerender: { enabled: true } }),
    viteReact(),
  ],
})

export default config
