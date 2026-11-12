import { describe, expect, it } from "vitest";
import { parseItems, validateRoulettePrizes, RouletteItem } from "./welcomeRouletteItems";

const item: RouletteItem = { id: "1", label: "40% OFF", type: "discount", value: 40, enabled: true, weight: 10, expiresDays: 30 };
describe("configurable roulette prizes", () => {
  it("reads each configured number and its prize in saved order", () => {
    const items = parseItems(JSON.stringify([item, { ...item, id: "2", label: "Massagem grátis", type: "service", serviceSlug: "massagem", serviceTitle: "Massagem" }]));
    expect(items[0].value).toBe(40);
    expect(items[1].serviceSlug).toBe("massagem");
    expect(items.map((it) => it.id)).toEqual(["1", "2"]);
  });
  it("accepts valid percentage prizes", () => expect(validateRoulettePrizes([item])).toBeNull());
  it("rejects percent prizes above 100", () => expect(validateRoulettePrizes([{ ...item, value: 101 }])).not.toBeNull());
  it("requires an active number with positive weight", () => expect(validateRoulettePrizes([{ ...item, weight: 0 }])).not.toBeNull());
  it("requires the selected service for an active free session", () => expect(validateRoulettePrizes([{ ...item, type: "service" }])).not.toBeNull());
});