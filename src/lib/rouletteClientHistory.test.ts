import { describe, it, expect } from "vitest";
import { groupRouletteClients, hasRoulettePrize, matchesRouletteClient, rouletteRecordStatus, roulettePrizeLabel, type RouletteRecord } from "./rouletteClientHistory";

const record: RouletteRecord = { id: "ticket1", user_id: "client1", code: "BV-123", discount_type: "percent", discount_value: 40, is_used: false, used_at: null, created_at: "2026-11-12T00:00:00Z", expires_at: "2026-12-12T00:00:00Z" };
describe("roulette client history", () => {
  it("keeps name, phone and all roulette prizes grouped per client", () => {
    const clients = groupRouletteClients([{ user_id: "client1", full_name: "João Silva", phone: "(11) 99999-1234" }], [record, { ...record, id: "ticket2", code: "ANIV-456" }]);
    expect(clients).toHaveLength(1);
    expect(clients[0].phone).toBe("(11) 99999-1234");
    expect(clients[0].history.map((r) => r.code)).toEqual(["BV-123", "ANIV-456"]);
  });
  it("does not count an unsuccessful spin as a won or used prize", () => {
    const noPrize = { ...record, code: "BV-NADA-123", is_used: true };
    expect(hasRoulettePrize(noPrize)).toBe(false);
    expect(rouletteRecordStatus(noPrize)).toBe("Sem prêmio");
  });
  it("includes clients who have not spun and excludes unrelated coupons", () => {
    const clients = groupRouletteClients([{ user_id: "client1", full_name: "João", phone: "123" }], [{ ...record, code: "OTHER-123" }]);
    expect(clients[0].history).toHaveLength(0);
  });
  it("searches accented names and formatted phones", () => {
    const client = { user_id: "client1", full_name: "João Silva", phone: "(11) 99999-1234", history: [record] };
    expect(matchesRouletteClient(client, "joao")).toBe(true);
    expect(matchesRouletteClient(client, "999991234")).toBe(true);
    expect(matchesRouletteClient(client, "88888")).toBe(false);
  });
  it("preserves used and expired status and percentage prize values", () => {
    expect(roulettePrizeLabel(record)).toBe("40% de desconto");
    expect(rouletteRecordStatus(record, Date.parse("2026-11-12"))).toBe("Disponível");
    expect(rouletteRecordStatus(record, Date.parse("2027-01-01"))).toBe("Expirado");
    expect(rouletteRecordStatus({ ...record, is_used: true }, Date.parse("2027-01-01"))).toBe("Usado");
  });
});