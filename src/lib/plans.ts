export type PlanId = "free" | "plus" | "pro" | "max";

export type Plan = {
  id: PlanId;
  label: string;
  price: string;
  priceUsd: number;
  sessionCap: number;
  models: string[]; // apex model ids allowed
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
    models: ["apex-nano", "apex-lite", "apex-mini"],
    features: [
      "8 000 токенов на сессию",
      "3 базовые модели",
      "Восстановление 2–4 часа",
      "Файлы и изображения (ограниченно)",
    ],
    accent: "from-zinc-500/40 to-zinc-500/10",
  },
  {
    id: "plus",
    label: "Plus",
    price: "$9",
    priceUsd: 9,
    sessionCap: 16_000,
    models: ["apex-nano", "apex-lite", "apex-mini", "apex-flash", "apex-sonic", "apex-vision"],
    features: [
      "16 000 токенов на сессию",
      "6 моделей включая Flash и Vision",
      "Приоритетная очередь",
      "Полная поддержка файлов",
    ],
    accent: "from-sky-500/40 to-sky-500/10",
  },
  {
    id: "pro",
    label: "Pro",
    price: "$19",
    priceUsd: 19,
    sessionCap: 32_000,
    models: [
      "apex-nano", "apex-lite", "apex-mini", "apex-flash", "apex-sonic",
      "apex-vision", "apex-pro", "apex-reasoner",
    ],
    features: [
      "32 000 токенов на сессию",
      "8 моделей включая Pro и Reasoner",
      "Ранний доступ к новым моделям",
      "Расширенные проекты в .zip",
    ],
    accent: "from-amber-500/40 to-amber-500/10",
  },
  {
    id: "max",
    label: "Max",
    price: "$39",
    priceUsd: 39,
    sessionCap: 64_000,
    models: [
      "apex-nano", "apex-lite", "apex-mini", "apex-flash", "apex-sonic",
      "apex-vision", "apex-pro", "apex-reasoner", "apex-ultra",
    ],
    features: [
      "64 000 токенов на сессию",
      "Все 9 моделей — включая Ultra",
      "Максимальный приоритет",
      "Персональная поддержка",
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