// Usage/statistics store backed by Lovable Cloud. Server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TABLE = "usage_events";

export type UsageEventInput = {
  source: "web" | "api";
  modelId: string;
  gatewayModel?: string;
  status: "ok" | "error";
  errorMessage?: string;
  statusCode?: number;
  tokens?: number;
  durationMs?: number;
  webSearch?: boolean;
  deepThink?: boolean;
  apiKeyId?: string | null;
};

export async function logUsage(e: UsageEventInput): Promise<void> {
  try {
    await (supabaseAdmin as any).from(TABLE).insert({
      source: e.source,
      model_id: e.modelId,
      gateway_model: e.gatewayModel ?? "",
      status: e.status,
      error_message: e.errorMessage?.slice(0, 500) ?? null,
      status_code: e.statusCode ?? null,
      tokens: Math.max(0, Math.round(e.tokens ?? 0)),
      duration_ms: Math.max(0, Math.round(e.durationMs ?? 0)),
      web_search: !!e.webSearch,
      deep_think: !!e.deepThink,
      api_key_id: e.apiKeyId ?? null,
    });
  } catch (err) {
    console.error("[usage] log failed", err);
  }
}

export type UsageRow = {
  id: string;
  source: string;
  model_id: string;
  status: string;
  error_message: string | null;
  status_code: number | null;
  tokens: number;
  duration_ms: number;
  web_search: boolean;
  deep_think: boolean;
  created_at: string;
};

export type UsageStats = {
  totals: {
    requests: number;
    ok: number;
    errors: number;
    tokens: number;
    avgDurationMs: number;
    successRate: number;
    webSearch: number;
    deepThink: number;
  };
  byModel: Array<{ modelId: string; requests: number; errors: number; tokens: number }>;
  bySource: Array<{ source: string; requests: number; errors: number }>;
  daily: Array<{ day: string; requests: number; errors: number; tokens: number }>;
  recent: UsageRow[];
};

export async function getUsageStats(days = 14, apiKeyId?: string | null): Promise<UsageStats> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  let q = (supabaseAdmin as any)
    .from(TABLE)
    .select("*")
    .gte("created_at", since);
  if (apiKeyId) q = q.eq("api_key_id", apiKeyId);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as UsageRow[];

  const requests = rows.length;
  const errors = rows.filter((r) => r.status !== "ok").length;
  const tokens = rows.reduce((s, r) => s + (r.tokens ?? 0), 0);
  const duration = rows.reduce((s, r) => s + (r.duration_ms ?? 0), 0);

  const modelMap = new Map<string, { requests: number; errors: number; tokens: number }>();
  const sourceMap = new Map<string, { requests: number; errors: number }>();
  const dayMap = new Map<string, { requests: number; errors: number; tokens: number }>();

  for (const r of rows) {
    const m = modelMap.get(r.model_id) ?? { requests: 0, errors: 0, tokens: 0 };
    m.requests++;
    if (r.status !== "ok") m.errors++;
    m.tokens += r.tokens ?? 0;
    modelMap.set(r.model_id, m);

    const s = sourceMap.get(r.source) ?? { requests: 0, errors: 0 };
    s.requests++;
    if (r.status !== "ok") s.errors++;
    sourceMap.set(r.source, s);

    const day = r.created_at.slice(0, 10);
    const d = dayMap.get(day) ?? { requests: 0, errors: 0, tokens: 0 };
    d.requests++;
    if (r.status !== "ok") d.errors++;
    d.tokens += r.tokens ?? 0;
    dayMap.set(day, d);
  }

  return {
    totals: {
      requests,
      ok: requests - errors,
      errors,
      tokens,
      avgDurationMs: requests ? Math.round(duration / requests) : 0,
      successRate: requests ? Math.round(((requests - errors) / requests) * 100) : 100,
      webSearch: rows.filter((r) => r.web_search).length,
      deepThink: rows.filter((r) => r.deep_think).length,
    },
    byModel: [...modelMap.entries()]
      .map(([modelId, v]) => ({ modelId, ...v }))
      .sort((a, b) => b.requests - a.requests),
    bySource: [...sourceMap.entries()].map(([source, v]) => ({ source, ...v })),
    daily: [...dayMap.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? -1 : 1)),
    recent: rows.slice(0, 50),
  };
}
