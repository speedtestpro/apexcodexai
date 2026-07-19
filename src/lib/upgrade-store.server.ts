// Persistent upgrade request store backed by Lovable Cloud (Supabase).
// Uses the service-role client — never import this from the browser bundle.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type UpgradeStatus = "pending" | "confirmed" | "rejected";
export type UpgradeRequest = {
  id: string;
  planId: string;
  planLabel: string;
  price: string;
  contact: string;
  method: string;
  note: string;
  userName: string;
  status: UpgradeStatus;
  createdAt: number;
  messageId?: number;
};

const TABLE = "upgrade_requests";

type Row = {
  id: string;
  plan_id: string;
  plan_label: string;
  price: string;
  contact: string;
  method: string;
  note: string;
  user_name: string;
  status: UpgradeStatus;
  message_id: number | null;
  created_at: string;
};

function rowToRec(r: Row): UpgradeRequest {
  return {
    id: r.id,
    planId: r.plan_id,
    planLabel: r.plan_label,
    price: r.price,
    contact: r.contact,
    method: r.method,
    note: r.note,
    userName: r.user_name,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    messageId: r.message_id ?? undefined,
  };
}

export function newUpgradeId() {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function getUpgrade(id: string): Promise<UpgradeRequest | null> {
  if (!id) return null;
  const { data, error } = await (supabaseAdmin as any)
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[upgrade-store] getUpgrade error", error);
    return null;
  }
  return data ? rowToRec(data as Row) : null;
}

export async function createUpgrade(rec: UpgradeRequest): Promise<void> {
  const { error } = await (supabaseAdmin as any).from(TABLE).insert({
    id: rec.id,
    plan_id: rec.planId,
    plan_label: rec.planLabel,
    price: rec.price,
    contact: rec.contact,
    method: rec.method,
    note: rec.note,
    user_name: rec.userName,
    status: rec.status,
    message_id: rec.messageId ?? null,
  });
  if (error) {
    console.error("[upgrade-store] createUpgrade error", error);
    throw new Error(error.message);
  }
}

export async function updateUpgradeStatus(
  id: string,
  status: UpgradeStatus,
): Promise<UpgradeRequest | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from(TABLE)
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("[upgrade-store] updateUpgradeStatus error", error);
    return null;
  }
  return data ? rowToRec(data as Row) : null;
}

export async function setUpgradeMessageId(
  id: string,
  messageId: number,
): Promise<void> {
  const { error } = await (supabaseAdmin as any)
    .from(TABLE)
    .update({ message_id: messageId })
    .eq("id", id);
  if (error) console.error("[upgrade-store] setUpgradeMessageId error", error);
}

export async function deleteUpgrade(id: string): Promise<void> {
  const { error } = await (supabaseAdmin as any).from(TABLE).delete().eq("id", id);
  if (error) console.error("[upgrade-store] deleteUpgrade error", error);
}

/** Best-effort ensure the record exists (used when webhook fires before we saw the id). */
export async function upsertMinimalUpgrade(
  id: string,
  planId: string,
): Promise<UpgradeRequest | null> {
  const existing = await getUpgrade(id);
  if (existing) return existing;
  const rec: UpgradeRequest = {
    id,
    planId,
    planLabel: planId,
    price: "",
    contact: "",
    method: "",
    note: "",
    userName: "",
    status: "pending",
    createdAt: Date.now(),
  };
  try {
    await createUpgrade(rec);
    return rec;
  } catch {
    return await getUpgrade(id);
  }
}
