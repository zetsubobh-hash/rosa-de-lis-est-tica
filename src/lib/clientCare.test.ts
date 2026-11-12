import { describe, it, expect } from "vitest";
import { petalProgress, careTipsFor } from "./clientCare";
describe("pétalas", () => {
  it("10 atendimentos geram 1 recompensa e zeram o cartão", () => expect(petalProgress(10)).toEqual({ filled: 0, rewardsEarned: 1 }));
  it("13 atendimentos mostram 3 pétalas", () => expect(petalProgress(13).filled).toBe(3));
});
describe("guia pós", () => {
  it("massagem redutora recebe dica de água", () => expect(careTipsFor("Massagem Redutora")[0]).toMatch(/água/));
});
