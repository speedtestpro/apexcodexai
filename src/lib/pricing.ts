// Виртуальные $ для API. Цены за 1M токенов, за изображение и за веб-поиск — у каждой модели свои.
import type { PlanId } from "./plans";

export type ModelPrice = { input: number; output: number; image: number; webSearch: number };

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "apex-flash":   { input: 0,    output: 0,    image: 0,    webSearch: 0 },
  "apex-mars":    { input: 0.10, output: 0.30, image: 0.02, webSearch: 0.01 },
  "apex-pro":     { input: 0.20, output: 0.60, image: 0.02, webSearch: 0.01 },
  "apex-licut":   { input: 0.25, output: 0.75, image: 0.02, webSearch: 0.01 },
  "apex-quasar":  { input: 0.40, output: 1.20, image: 0.03, webSearch: 0.01 },
  "apex-mars-13": { input: 0.60, output: 1.80, image: 0.03, webSearch: 0.01 },
};

/** Дневной бюджет виртуальных $ по тарифу. Сбрасывается в 00:00 по Киеву. */
export const DAILY_BUDGET_USD: Record<PlanId, number> = {
  free: 0.05,
  pro: 0.5,
  max: 1.2,
};

export function priceFor(modelId: string): ModelPrice {
  return MODEL_PRICES[modelId] ?? MODEL_PRICES["apex-mars"];
}

export function computeCost(
  modelId: string,
  u: { inputTokens?: number; outputTokens?: number; images?: number; webSearches?: number },
): number {
  const p = priceFor(modelId);
  const c =
    ((u.inputTokens ?? 0) / 1_000_000) * p.input +
    ((u.outputTokens ?? 0) / 1_000_000) * p.output +
    (u.images ?? 0) * p.image +
    (u.webSearches ?? 0) * p.webSearch;
  return Math.round(c * 1e8) / 1e8;
}

/** Начало текущих суток по Киеву (Europe/Kyiv) и следующего сброса, в UTC. */
export function kyivDayBounds(now = new Date()): { start: Date; next: Date } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = asUtc - Math.floor(now.getTime() / 1000) * 1000; // смещение Киева от UTC
  const startLocal = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  const start = new Date(startLocal - offset);
  const next = new Date(start.getTime() + 86_400_000);
  return { start, next };
}
