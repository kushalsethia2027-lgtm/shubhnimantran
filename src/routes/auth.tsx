import { createFileRoute } from "@tanstack/react-router";
import { SocialApp } from "@/features/social/SocialApp";
export const Route = createFileRoute("/auth")({
  component: SocialApp,
  head: () => ({
    meta: [
      { title: "Sign in · Nimantran" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});
