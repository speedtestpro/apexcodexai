// Ephemeral in-memory pending upgrade requests. Fine for demo — resets on worker restart.
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

const g = globalThis as unknown as { __apexUpgrades?: Map<string, UpgradeRequest> };
if (!g.__apexUpgrades) g.__apexUpgrades = new Map();
export const upgrades: Map<string, UpgradeRequest> = g.__apexUpgrades;

export function newUpgradeId() {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Housekeeping: drop entries older than 24h
export function gcUpgrades() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [k, v] of upgrades) if (v.createdAt < cutoff) upgrades.delete(k);
}