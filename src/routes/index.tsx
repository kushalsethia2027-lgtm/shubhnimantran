import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/features/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nimantran — Personal video wedding invitations on WhatsApp" },
      {
        name: "description",
        content:
          "Record once. Nimantran sends every wedding guest a personal video invitation in your own voice, with the right relation and language, on WhatsApp.",
      },
      {
        property: "og:title",
        content: "Nimantran — Personal video wedding invitations",
      },
      {
        property: "og:description",
        content:
          "Every guest gets a personal invitation from you. Even the 300th. Join the waitlist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
