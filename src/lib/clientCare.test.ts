import { describe, it, expect } from "vitest";
import { petalProgress, careTipsFor, classifyClientAppointments } from "./clientCare";
describe("pétalas", () => {
  it("10 atendimentos geram 1 recompensa e zeram o cartão", () => expect(petalProgress(10)).toEqual({ filled: 0, rewardsEarned: 1 }));
  it("13 atendimentos mostram 3 pétalas", () => expect(petalProgress(13).filled).toBe(3));
});
describe("guia pós", () => {
  it("massagem redutora recebe dica de água", () => expect(careTipsFor("Massagem Redutora")[0]).toMatch(/água/));
});
describe("filtros da visão do cliente", () => {
  const appts = [
    { user_id: "a", status: "confirmed", appointment_date: "2026-11-20" },
    { user_id: "b", status: "completed", appointment_date: "2026-11-01" },
    { user_id: "c", status: "pending", appointment_date: "2026-11-10" },
  ];
  it("conta agendados futuros e finalizados", () => {
    const r = classifyClientAppointments(["a", "b", "c"], appts, "2026-11-13");
    expect(r.counts).toEqual({ all: 3, scheduled: 1, finished: 1 });
  });
  it("filtra agendados e ignora pendência vencida", () => {
    const r = classifyClientAppointments(["a", "b", "c"], appts, "2026-11-13");
    expect(r.filterIds("scheduled")).toEqual(["a"]);
    expect(r.filterIds("finished")).toEqual(["b"]);
    expect(r.filterIds("all")).toEqual(["a", "b", "c"]);
  });
});
