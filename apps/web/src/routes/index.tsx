import { createFileRoute } from "@tanstack/react-router"

import { Landing } from "@/components/landing/landing"

/** Production default: Cursor-style white UI + painted product stage. */
export const Route = createFileRoute("/")({
  component: () => <Landing theme="clarity" />,
})
