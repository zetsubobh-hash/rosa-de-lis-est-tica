import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAgendaClientSearch } from "./useAgendaClientSearch";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), range: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));

describe("agenda database search", () => {
  it("queries the database for Fernanda advogada again after editing the search", async () => {
    const order = vi.fn();
    order.mockReturnValue({ order, range: mocks.range });
    mocks.rpc.mockReturnValue({ order });
    mocks.range.mockResolvedValue({ data: [{ user_id: "fernanda-id", full_name: "Fernanda advogada" }], error: null });
    const { result, rerender } = renderHook(({ search }) => useAgendaClientSearch(search, true), { initialProps: { search: "Fernanda" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ search: "Fernanda advogada" });
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith("search_agenda_clients", { _search: "Fernanda advogada" }));
    await waitFor(() => expect(result.current.clients).toEqual([{ user_id: "fernanda-id", full_name: "Fernanda advogada" }]));
    expect(mocks.range).toHaveBeenCalledWith(0, 99);
  });
});