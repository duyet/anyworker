import { createFileRoute } from "@tanstack/react-router"
import { app } from "@/server/app"

/**
 * Wildcard server route: everything under /api/* is handed to Hono as a raw
 * Request. Start keeps ownership of every page route, so the prerendered HTML
 * is never routed through here.
 */
const serve = ({ request }: { request: Request }) => app.fetch(request)

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      PUT: serve,
      PATCH: serve,
      DELETE: serve,
      OPTIONS: serve,
      HEAD: serve,
    },
  },
})
