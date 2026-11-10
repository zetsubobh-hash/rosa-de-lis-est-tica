import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: api }));
import { loadSharedPartnerAgenda, loadAgendaLabels } from "./sharedPartnerAgenda";

describe("shared partner agenda", () => {
  it("includes other professionals, unassigned bookings and overdue pending bookings without truncation", async () => {
    const rows = Array.from({ length: 1005 }, (_, i) => ({
      id: String(i), partner_id: i % 2 ? "other-partner" : null,
      appointment_date: "2026-11-09", status: "pending",
    }));
    const chain = {
      select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      range: vi.fn((from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null })),
    };
    api.from.mockReturnValue(chain);
    const result = await loadSharedPartnerAgenda();
    expect(result.data).toHaveLength(1005);
    expect(result.data?.[0].partner_id).toBeNull();
    expect(result.data?.[1].partner_id).toBe("other-partner");
    expect(result.data?.[0].appointment_date).toBe("2026-11-09");
    expect(chain.eq).not.toHaveBeenCalled();
    expect(chain.gte).not.toHaveBeenCalled();
    expect(chain.in).toHaveBeenCalledWith("status", ["confirmed", "pending"]);
  });

  it("loads client labels through the limited RPC instead of private profile fields", async () => {
    api.from.mockClear();
    api.rpc.mockResolvedValue({ data: [{ user_id: "client", full_name: "Cliente", avatar_url: null }], error: null });
    const result = await loadAgendaLabels(["client"]);
    expect(api.rpc).toHaveBeenCalledWith("get_agenda_client_labels", { _user_ids: ["client"] });
    expect(api.from).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ user_id: "client", full_name: "Cliente", avatar_url: null }]);
  });
});