import { describe, it, expect } from "vitest";
import { computeCost, kyivDayBounds } from "./pricing";
describe("pricing", () => {
  it("Mars 1.2: 1M input = $0.10, 1M output = $0.30", () => {
    expect(computeCost("apex-mars", { inputTokens: 1_000_000 })).toBeCloseTo(0.1);
    expect(computeCost("apex-mars", { outputTokens: 1_000_000 })).toBeCloseTo(0.3);
  });
  it("image $0.02, web search $0.01 on Mars 1.2", () => {
    expect(computeCost("apex-mars", { images: 1, webSearches: 1 })).toBeCloseTo(0.03);
  });
  it("Flash is free", () => {
    expect(computeCost("apex-flash", { inputTokens: 5_000_000, outputTokens: 5_000_000 })).toBe(0);
  });
  it("resets at 00:00 Kyiv", () => {
    const { start, next } = kyivDayBounds(new Date("2026-11-05T11:19:00Z"));
    expect(start.toISOString()).toBe("2026-11-04T22:00:00.000Z");
    expect(next.toISOString()).toBe("2026-11-05T22:00:00.000Z");
  });
});
