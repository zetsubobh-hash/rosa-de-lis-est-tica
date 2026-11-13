import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminEvolutionConversations from "./AdminEvolutionConversations";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
afterEach(() => { cleanup(); invoke.mockReset(); });

describe("Arquivos indisponíveis nas conversas", () => {
  it("abre o histórico completo do contato da busca geral e sai da lista de resultados", async () => {
    const chat = { jid: "5511888888888@s.whatsapp.net", name: "Ana busca", phone: "5511888888888", unread: 0, last: null };
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.action === "sync") return { data: { saved: 0, hasMore: false, nextPage: 2, warning: "" } };
      if (body.action === "chats") return { data: { chats: [], pages: 1, total: 0, instance: "Teste" } };
      if (body.action === "global_search") return { data: { results: [{ chat, message: { id: "hit", kind: "text", text: "Quero horário", timestamp: 100 } }], total: 1, pages: 1 } };
      if (body.action === "messages") return { data: { messages: [{ id: "context", kind: "text", text: "Contexto completo", timestamp: 101 }], total: 1, hasMore: false } };
      throw new Error("Unexpected action");
    });
    render(<AdminEvolutionConversations />);
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar assunto em todas as conversas" }), { target: { value: "horário" } });
    fireEvent.click(await screen.findByRole("button", { name: "Abrir conversa" }));
    await screen.findByText("Contexto completo");
    expect(screen.queryByRole("region", { name: "Resultados da busca geral" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Buscar assunto nesta conversa" })).toHaveValue("");
    expect(invoke).toHaveBeenCalledWith("evolution-conversations", { body: { action: "messages", jid: chat.jid, page: 1, search: "" } });
  });
  it("mantém a conversa visível e não cria reprodutor inválido ao abrir áudio e imagem expirados", async () => {
    invoke.mockImplementation(async (_name, { body }) => {
      if (body.action === "sync") return { data: { saved: 2, hasMore: false, nextPage: 2, warning: "" } };
      if (body.action === "chats") return { data: { chats: [{ jid: "5511999999999@s.whatsapp.net", name: "Contato teste", phone: "5511999999999", unread: 0, last: null }], pages: 1, total: 1, instance: "Teste" } };
      if (body.action === "messages") return { data: { messages: [
        { id: "audio", fromMe: false, timestamp: 100, sender: "Contato teste", kind: "audio", text: "", seconds: 3 },
        { id: "image", fromMe: false, timestamp: 101, sender: "Contato teste", kind: "image", text: "", seconds: 0 },
      ], hasMore: false } };
      return { data: { available: false, error: "Arquivo expirado no WhatsApp" } };
    });
    const { container } = render(<AdminEvolutionConversations />);
    fireEvent.click(await screen.findByRole("button", { name: /Contato teste/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Ouvir áudio/ }));
    await screen.findByText("Arquivo expirado no WhatsApp");
    fireEvent.click(screen.getByRole("button", { name: "Abrir imagem" }));
    await waitFor(() => expect(screen.getAllByText("Arquivo expirado no WhatsApp")).toHaveLength(2));
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { name: "Conversas WhatsApp" })).toBeVisible();
  });
});