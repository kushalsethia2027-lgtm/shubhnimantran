import { createFileRoute } from "@tanstack/react-router";
import { SocialApp } from "@/features/social/SocialApp";
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Nimantran — Find your scene. Gurgaon first." },
      {
        name: "description",
        content:
          "Discover hosted adult gatherings in Gurgaon. Board games, supper clubs, music and new connections. Find your scene or host your own.",
      },
    ],
  }),
  component: SocialApp,
});
