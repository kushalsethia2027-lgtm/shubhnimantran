import { createFileRoute } from "@tanstack/react-router";
import { Planner } from "@/features/planner/Planner";
export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Guest & Travel Planner · Nimantran" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Planner,
});
