import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/studio/shell";

export const Route = createFileRoute("/")({
  component: Shell,
});
