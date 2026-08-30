import { createFileRoute } from "@tanstack/react-router";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getUsageStats } = await import("@/lib/usage.server");
        const url = new URL(request.url);
        const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14) || 14));
        const key = (url.searchParams.get("key") ?? "").trim();
        try {
          let keyInfo: null | {
            planId: string;
            planLabel: string;
            label: string;
            requestsUsed: number;
            tokensUsed: number;
            createdAt: string;
            sessionCap: number;
          } = null;
          let apiKeyId: string | null = null;

          if (key) {
            const { getApiKey } = await import("@/lib/apikeys.server");
            const rec = await getApiKey(key);
            if (!rec || rec.revoked) {
              return Response.json({ error: "invalid_key" }, { status: 404 });
            }
            const plan = getPlan(rec.planId);
            apiKeyId = rec.id;
            keyInfo = {
              planId: rec.planId,
              planLabel: plan.label,
              label: rec.label,
              requestsUsed: rec.requestsUsed,
              tokensUsed: rec.tokensUsed,
              createdAt: rec.createdAt,
              sessionCap: plan.sessionCap,
            };
          }

          const stats = await getUsageStats(days, apiKeyId);
          return Response.json(
            { days, scope: apiKeyId ? "key" : "all", keyInfo, ...stats },
            { headers: { "cache-control": "no-store" } },
          );
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
