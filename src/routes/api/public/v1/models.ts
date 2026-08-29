import { createFileRoute } from "@tanstack/react-router";
import { APEX_MODELS } from "@/lib/models";
import { getPlan } from "@/lib/plans";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-api-key",
  "access-control-allow-methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/v1/models")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const { extractBearer, getApiKey } = await import("@/lib/apikeys.server");
        const apiKey = extractBearer(request);
        if (!apiKey) {
          return Response.json(
            { error: { type: "invalid_api_key", message: "Отсутствует Authorization: Bearer apex_sk_..." } },
            { status: 401, headers: CORS },
          );
        }
        const rec = await getApiKey(apiKey);
        if (!rec || rec.revoked) {
          return Response.json(
            { error: { type: "invalid_api_key", message: "Неверный или отозванный API-ключ" } },
            { status: 401, headers: CORS },
          );
        }
        const plan = getPlan(rec.planId);
        return Response.json(
          {
            object: "list",
            plan: { id: plan.id, label: plan.label, session_cap: plan.sessionCap },
            data: APEX_MODELS.map((m) => ({
              id: m.id,
              object: "model",
              owned_by: "seulop",
              label: m.label,
              vision: m.supportsVision,
              web_search: !!m.supportsWebSearch,
              available: plan.models.includes(m.id),
            })),
          },
          { headers: CORS },
        );
      },
    },
  },
});
