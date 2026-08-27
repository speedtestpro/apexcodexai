// API key store backed by Lovable Cloud. Service-role only — never import in the browser.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ApiKeyRecord = {
  id: string;
  key: string;
  planId: string;
  upgradeId: string | null;
  label: string;
  revoked: boolean;
  requestsUsed: number;
  tokensUsed: number;
  createdAt: string;
};

const TABLE = "api_keys";

type Row = {
  id: string;
  key: string;
  plan_id: string;
  upgrade_id: string | null;
  label: string;
  revoked: boolean;
  requests_used: number;
  tokens_used: number;
  created_at: string;
};

function toRec(r: Row): ApiKeyRecord {
  return {
    id: r.id,
    key: r.key,
    planId: r.plan_id,
    upgradeId: r.upgrade_id,
    label: r.label,
    revoked: r.revoked,
    requestsUsed: r.requests_used,
    tokensUsed: Number(r.tokens_used ?? 0),
    createdAt: r.created_at,
  };
}

export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `apex_sk_${hex}`;
}

export async function createApiKey(
  planId: string,
  upgradeId: string | null,
  label = "default",
): Promise<ApiKeyRecord> {
  const key = generateApiKey();
  const { data, error } = await (supabaseAdmin as any)
    .from(TABLE)
    .insert({ key, plan_id: planId, upgrade_id: upgradeId, label })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toRec(data as Row);
}

export async function getApiKey(key: string): Promise<ApiKeyRecord | null> {
  if (!key) return null;
  const { data, error } = await (supabaseAdmin as any)
    .from(TABLE)
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[api-keys] get error", error);
    return null;
  }
  return data ? toRec(data as Row) : null;
}

export async function revokeApiKey(key: string): Promise<void> {
  await (supabaseAdmin as any).from(TABLE).update({ revoked: true }).eq("key", key);
}

/** Re-point an existing key at a (newly purchased) plan. */
export async function setApiKeyPlan(
  key: string,
  planId: string,
  upgradeId: string | null,
): Promise<ApiKeyRecord | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from(TABLE)
    .update({ plan_id: planId, upgrade_id: upgradeId })
    .eq("key", key)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[api-keys] setPlan error", error);
    return null;
  }
  return data ? toRec(data as Row) : null;
}

export async function touchApiKey(key: string, tokens: number): Promise<void> {
  try {
    const rec = await getApiKey(key);
    if (!rec) return;
    await (supabaseAdmin as any)
      .from(TABLE)
      .update({
        requests_used: rec.requestsUsed + 1,
        tokens_used: rec.tokensUsed + Math.max(0, Math.round(tokens)),
        last_used_at: new Date().toISOString(),
      })
      .eq("key", key);
  } catch (e) {
    console.error("[api-keys] touch error", e);
  }
}

export function extractBearer(request: Request): string {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  if (m) return m[1].trim();
  return (request.headers.get("x-api-key") ?? "").trim();
}
