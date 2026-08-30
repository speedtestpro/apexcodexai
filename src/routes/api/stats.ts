import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getUsageStats } = await import("@/lib/usage.server");
        const url = new URL(request.url);
        const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14) || 14));
        try {
          const stats = await getUsageStats(days);
          return Response.json({ days, ...stats }, { headers: { "cache-control": "no-store" } });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "stats error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
