import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LisAssistant from "./LisAssistant";

let settingValue: string | null = "true";

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isAdmin: true, isPartner: false, loading: false }),
}));

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
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

describe("LisAssistant", () => {
  beforeEach(() => {
    settingValue = "true";
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
});