import { Hono } from "hono"

/**
 * The API surface, mounted at /api by src/routes/api/$.ts.
 *
 * Scope discipline: Hono owns `/api/*` and nothing else. TanStack Start owns
 * every page route. Widening this to a catch-all would put Hono in front of the
 * prerendered HTML and break static serving.
 */
export const app = new Hono().basePath("/api")

app.get("/health", (c) => c.json({ ok: true, service: "anyworker-web" }))

/**
 * Waitlist signup.
 *
 * There is no datastore provisioned yet, so this validates and acknowledges
 * without persisting. The response says so explicitly rather than implying a
 * record was written — see PLAN.md, "Open questions".
 */
app.post("/waitlist", async (c) => {
  let email: unknown

  try {
    const body: Record<string, unknown> = await c.req.json()
    email = body.email
  } catch {
    return c.json({ ok: false, error: "expected a json body" }, 400)
  }

  if (typeof email !== "string" || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return c.json({ ok: false, error: "a valid email is required" }, 400)
  }

  console.log(JSON.stringify({ event: "waitlist.signup", email }))

  return c.json({ ok: true, stored: false, note: "recorded in logs only" }, 202)
})

app.notFound((c) => c.json({ ok: false, error: "not found" }, 404))
