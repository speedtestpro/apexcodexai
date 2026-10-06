export type PlanId = "free" | "pro" | "max";

export type Plan = {
  id: PlanId;
  label: string;
  price: string;
  priceUsd: number;
  sessionCap: number;
  models: string[]; // apex model ids allowed
  /** Можно ли вручную выбирать модель (иначе — авто-роутинг). */
  manualModelPick: boolean;
  /** Сколько первых запросов сессии уходят на Apex Pro при авто-роутинге. */
  autoProRequests: number;
  features: string[];
  accent: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    label: "Free",
    price: "$0",
    priceUsd: 0,
    sessionCap: 8_000,
    models: ["apex-mars", "apex-pro"],
    manualModelPick: false,
    autoProRequests: 12,
    features: [
      "8 000 токенов на сессию",
      "Авто-выбор модели: первые 12 запросов на Apex Pro, дальше ApexMars 1.2",
      "Ручной выбор модели недоступен",
      "Файлы и изображения (ограниченно)",
    ],
    accent: "from-zinc-500/40 to-zinc-500/10",
  },
  {
    id: "pro",
    label: "Pro",
    price: "$19",
    priceUsd: 19,
    sessionCap: 32_000,
    models: ["apex-mars", "apex-pro", "apex-vision", "apex-quasar"],
    manualModelPick: true,
    autoProRequests: 0,
    features: [
      "32 000 токенов на сессию",
      "Ручной выбор модели",
      "ApexMars 1.2, Pro, Quasar и Vision (генерация фото)",
      "Приоритетная очередь и проекты в .zip",
    ],
    accent: "from-amber-500/40 to-amber-500/10",
  },
  {
    id: "max",
    label: "Max",
    price: "$39",
    priceUsd: 39,
    sessionCap: 64_000,
    models: ["apex-mars", "apex-pro", "apex-vision", "apex-quasar"],
    manualModelPick: true,
    autoProRequests: 0,
    features: [
      "64 000 токенов на сессию",
      "Все модели, включая ApexMars 1.2",
      "Максимальная защита от джейлбрейка",
      "Максимальный приоритет и поддержка",
    ],
    accent: "from-fuchsia-500/40 to-fuchsia-500/10",
  },
];


export const DEFAULT_PLAN_ID: PlanId = "free";

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

const K_PLAN = "apexcode:plan:v1";

export function loadPlan(): PlanId {
  if (typeof window === "undefined") return DEFAULT_PLAN_ID;
  try {
    const v = localStorage.getItem(K_PLAN) as PlanId | null;
    if (v && PLANS.some((p) => p.id === v)) return v;
  } catch {}
  return DEFAULT_PLAN_ID;
}
export function savePlan(id: PlanId) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(K_PLAN, id); } catch {}
}

const K_UPGRADE = "apexcode:upgrade:v1";

/** Id of the confirmed upgrade request that unlocked the current plan. */
export function loadUpgradeId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(K_UPGRADE); } catch { return null; }
}
export function saveUpgradeId(id: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(K_UPGRADE, id); } catch {}
}

/** Модель для авто-роутинга (Free): первые N запросов — Pro, дальше Flash. */
export function autoRouteModelId(plan: Plan, requestIndex: number): string {
  return requestIndex < plan.autoProRequests ? "apex-pro" : "apex-mars";
}
