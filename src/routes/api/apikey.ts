import { createFileRoute } from "@tanstack/react-router";
import { getPlan } from "@/lib/plans";

export const Route = createFileRoute("/api/apikey")({
  server: {
    handlers: {
      // Info about an existing key
      GET: async ({ request }) => {
        const { getApiKey } = await import("@/lib/apikeys.server");
        const url = new URL(request.url);
        const key = url.searchParams.get("key") ?? "";
        const rec = await getApiKey(key);
        if (!rec || rec.revoked) return Response.json({ error: "not_found" }, { status: 404 });
        const plan = getPlan(rec.planId);
        return Response.json({
          key: rec.key,
          planId: rec.planId,
          planLabel: plan.label,
          models: plan.models,
          sessionCap: plan.sessionCap,
          requestsUsed: rec.requestsUsed,
          tokensUsed: rec.tokensUsed,
          createdAt: rec.createdAt,
        });
      },
      // Create a key (or move an existing key onto a purchased plan)
      POST: async ({ request }) => {
        const { createApiKey, getApiKey, setApiKeyPlan } = await import("@/lib/apikeys.server");
        const { getUpgrade } = await import("@/lib/upgrade-store.server");
        let body: { planId?: string; upgradeId?: string; key?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }
        const planId = body.planId ?? "free";
        const plan = getPlan(planId);
        let upgradeId: string | null = null;

        if (plan.priceUsd > 0) {
          const id = (body.upgradeId ?? "").trim();
          if (!id) {
            return Response.json(
              { error: "plan_not_purchased", message: `Тариф ${plan.label} не оплачен. Оформите его в разделе «Тарифы».` },
              { status: 402 },
            );
          }
          const up = await getUpgrade(id);
          if (!up || up.status !== "confirmed" || up.planId !== plan.id) {
            return Response.json(
              { error: "plan_not_confirmed", message: "Оплата тарифа ещё не подтверждена." },
              { status: 402 },
            );
          }
          upgradeId = id;
        }

        if (body.key) {
          const existing = await getApiKey(body.key);
          if (existing && !existing.revoked) {
            const updated = await setApiKeyPlan(body.key, plan.id, upgradeId);
            return Response.json({ key: body.key, planId: updated?.planId ?? plan.id, planLabel: plan.label, models: plan.models });
          }
        }

        try {
          const rec = await createApiKey(plan.id, upgradeId);
          return Response.json({ key: rec.key, planId: rec.planId, planLabel: plan.label, models: plan.models });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          return Response.json({ error: "create_failed", message: msg }, { status: 500 });
        }
      },
      DELETE: async ({ request }) => {
        const { revokeApiKey } = await import("@/lib/apikeys.server");
        const url = new URL(request.url);
        const key = url.searchParams.get("key") ?? "";
        if (key) await revokeApiKey(key);
        return Response.json({ ok: true });
      },
    },
  },
});
