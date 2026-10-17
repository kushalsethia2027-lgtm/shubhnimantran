import { createFileRoute } from "@tanstack/react-router";
import { DemoStudio } from "@/features/demo/DemoStudio";
export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Try Nimantran · No-login invitation studio" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DemoStudio,
});
