import { createFileRoute } from "@tanstack/react-router";
import { GoogleCallback } from "@/features/auth/GoogleCallback";
export const Route = createFileRoute("/auth")({
  component: GoogleCallback,
  head: () => ({
    meta: [
      { title: "Sign in · Nimantran" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});
