import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LisAssistant from "./LisAssistant";

let settingValue: string | null = "true";

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isAdmin: true, isPartner: false, loading: false }),
}));

let accessToken: string | null = "valid-token";
const refreshSessionMock = vi.fn(() =>
  Promise.resolve({ data: { session: { access_token: "fresh-token" } } }),
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: settingValue === null ? null : { value: settingValue }, error: null }),
        }),
      }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: accessToken ? { access_token: accessToken } : null } }),
      refreshSession: () => refreshSessionMock(),
    },
  },
}));

describe("LisAssistant", () => {
  beforeEach(() => {
    settingValue = "true";
    accessToken = "valid-token";
    refreshSessionMock.mockClear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("stays hidden when lis_assistant_enabled is false", async () => {
    settingValue = "false";
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <LisAssistant />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("Abrir assistente Lis")).toBeNull();
    });
  });

  it("reacts to lis-assistant-setting toggle event", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <LisAssistant />
      </MemoryRouter>,
    );

    await screen.findByLabelText("Abrir assistente Lis");

    act(() => {
      window.dispatchEvent(new CustomEvent("lis-assistant-setting", { detail: false }));
    });
    expect(screen.queryByLabelText("Abrir assistente Lis")).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent("lis-assistant-setting", { detail: true }));
    });
    expect(screen.getByLabelText("Abrir assistente Lis")).toBeTruthy();
  });

  it("places Ajuda button at the bottom on mobile when dismissed so it does not cover the menu button", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <LisAssistant />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByLabelText("Fechar assistente"));
    const helpBtn = screen.getByLabelText("Abrir ajuda");
    expect(helpBtn.className).toContain("bottom-4");
    expect(helpBtn.className).not.toMatch(/(^|\s)top-3(\s|$)/);
    expect(helpBtn.className).toContain("md:top-3");
  });

  it("retries with a refreshed session on 401 and renders streamed SSE reply", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Entre novamente" }), { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Olá! "}}]}\n\n'));
              controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Como posso ajudar?"}}]}\n\ndata: [DONE]\n'));
              controller.close();
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <LisAssistant />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByLabelText("Abrir assistente Lis"));
    const input = screen.getByPlaceholderText("Pergunte à Lis...");
    fireEvent.change(input, { target: { value: "Como agendar?" } });
    fireEvent.submit(input.closest("form")!);

    await screen.findByText("Olá! Como posso ajudar?");
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});