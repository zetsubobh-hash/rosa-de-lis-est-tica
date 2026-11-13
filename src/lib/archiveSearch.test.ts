import { describe, expect, it, vi } from "vitest";
import { searchArchivedMessages } from "../../supabase/functions/evolution-conversations/archiveSearch";

describe("Busca geral de conversas", () => {
  it("busca todas as conversas da instância antes de paginar e identifica cada contato", async () => {
    const messages = [{ jid: "ana", content: { id: "1", text: "Horário de Ana" } }, { jid: "bia", content: { id: "2", text: "Horário de Bia" } }];
    const range = vi.fn().mockResolvedValue({ data: messages, count: 120, error: null });
    const messageQuery: any = { select: vi.fn(), eq: vi.fn(), ilike: vi.fn(), order: vi.fn(), range };
    for (const name of ["select", "eq", "ilike", "order"]) messageQuery[name].mockReturnValue(messageQuery);
    const contactQuery: any = { select: vi.fn(), eq: vi.fn(), in: vi.fn().mockResolvedValue({ data: [{ jid: "ana", name: "Ana", phone: "5511999999999" }, { jid: "bia", name: "Bia", phone: null }], error: null }) };
    contactQuery.select.mockReturnValue(contactQuery); contactQuery.eq.mockReturnValue(contactQuery);
    const db = { from: vi.fn((table: string) => table === "evolution_message_archive" ? messageQuery : contactQuery) };
    const result = await searchArchivedMessages(db, "configured-instance", "HORÁRIO", 2);
    expect(messageQuery.eq.mock.calls).toEqual([["instance", "configured-instance"]]);
    expect(messageQuery.ilike).toHaveBeenCalledWith("search_text", "%horario%");
    expect(range).toHaveBeenCalledWith(50, 99);
    expect(messageQuery.ilike.mock.invocationCallOrder[0]).toBeLessThan(range.mock.invocationCallOrder[0]);
    expect(contactQuery.eq).toHaveBeenCalledWith("instance", "configured-instance");
    expect(contactQuery.in).toHaveBeenCalledWith("jid", ["ana", "bia"]);
    expect(result.total).toBe(120); expect(result.pages).toBe(3);
    expect(result.results).toMatchObject([{ chat: { name: "Ana", phone: "5511999999999" }, message: { id: "1" } }, { chat: { name: "Bia", phone: null }, message: { id: "2" } }]);
  });
  it("não consulta nem expõe o histórico quando o termo está vazio", async () => {
    const db = { from: vi.fn() };
    expect(await searchArchivedMessages(db, "configured-instance", "  %_ ", 1)).toEqual({ results: [], total: 0, pages: 1 });
    expect(db.from).not.toHaveBeenCalled();
  });
});