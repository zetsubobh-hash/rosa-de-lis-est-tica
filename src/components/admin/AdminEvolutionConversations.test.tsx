import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminEvolutionConversations from "./AdminEvolutionConversations";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
afterEach(() => { cleanup(); invoke.mockReset(); });

describe("Arquivos indisponíveis nas conversas", () => {
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