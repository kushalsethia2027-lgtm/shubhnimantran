import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/features/landing/ProductPage";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "How Nimantran works" },
      {
        name: "description",
        content:
          "Record once with consent, upload your guest list, preview samples, and approve personal invitations before production or delivery.",
      },
      { property: "og:title", content: "How Nimantran works" },
      {
        property: "og:description",
        content:
          "Four steps: record, guest list, preview, send and track — personal video invitations in your family's own voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});
