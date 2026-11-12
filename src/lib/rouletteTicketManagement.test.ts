import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteRouletteTickets, saveRouletteTicket } from "./rouletteTicketManagement";

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), delete: vi.fn(), in: vi.fn(), select: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.update.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
  mocks.delete.mockReturnValue(mocks);
  mocks.in.mockReturnValue(mocks);
});
describe("roulette ticket management", () => {
  it("persists edits to the selected ticket, including usage date", async () => {
    mocks.select.mockResolvedValue({ data: [{ id: "ticket-1" }], error: null });
    const update = { code: "BV-123", discount_type: "percent", discount_value: 40, expires_at: "2026-12-12T23:59:00.000Z", is_used: true, used_at: "2026-11-12T01:10:00.000Z" };
    await saveRouletteTicket("ticket-1", update);
    expect(mocks.from).toHaveBeenCalledWith("coupons");
    expect(mocks.update).toHaveBeenCalledWith(update);
    expect(mocks.eq).toHaveBeenCalledWith("id", "ticket-1");
  });
  it("deletes only selected tickets", async () => {
    mocks.select.mockResolvedValue({ data: [{ id: "ticket-1" }, { id: "ticket-2" }], error: null });
    await deleteRouletteTickets(["ticket-1", "ticket-2"]);
    expect(mocks.in).toHaveBeenCalledWith("id", ["ticket-1", "ticket-2"]);
    expect(mocks.delete).toHaveBeenCalledOnce();
  });
  it("does not report success for a denied edit", async () => {
    mocks.select.mockResolvedValue({ data: [], error: null });
    await expect(saveRouletteTicket("ticket-1", { code: "BV-123", discount_type: "percent", discount_value: 40, expires_at: "2026-12-12", is_used: false, used_at: null })).rejects.toThrow("não foi atualizado");
  });
});