import { createFileRoute } from "@tanstack/react-router";
import { getUpgrade } from "@/lib/upgrade-store.server";

export const Route = createFileRoute("/api/upgrade/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        const rec = await getUpgrade(id);
        if (!rec) return Response.json({ status: "unknown" }, { status: 404 });
        return Response.json({
          status: rec.status,
          planId: rec.planId,
          planLabel: rec.planLabel,
        });
      },
    },
  },
});
