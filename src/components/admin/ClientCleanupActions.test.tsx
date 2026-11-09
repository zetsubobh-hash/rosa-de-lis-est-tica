import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientCleanupActions from "./ClientCleanupActions";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, info: mocks.info } }));

describe("client cleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests only name cleanup after confirmation, never database maintenance", async () => {
    mocks.rpc.mockResolvedValue({ data: { updated: 2, skipped: 0 }, error: null });
    render(<ClientCleanupActions onNamesCleaned={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar espaços e emojis dos nomes" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(mocks.rpc.mock.calls).toEqual([["clean_client_name_emojis"]]);
  });

  it("reloads saved client names after emoji cleanup", async () => {
    mocks.rpc.mockResolvedValue({ data: { updated: 4, skipped: 1 }, error: null });
    const refresh = vi.fn();
    render(<ClientCleanupActions onNamesCleaned={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar espaços e emojis dos nomes" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mocks.rpc.mock.calls).toEqual([["clean_client_name_emojis"]]);
    expect(mocks.info).toHaveBeenCalledTimes(1);
  });

  it("does not report success or reload names when access is denied", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const refresh = vi.fn();
    render(<ClientCleanupActions onNamesCleaned={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar espaços e emojis dos nomes" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("cleans saved prefixes only after confirmation and reloads the directory", async () => {
    mocks.rpc.mockResolvedValue({ data: { updated: 3, skipped: 1 }, error: null });
    const refresh = vi.fn();
    render(<ClientCleanupActions onNamesCleaned={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar sinais no início dos nomes" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(mocks.rpc.mock.calls).toEqual([["clean_client_name_prefixes"]]);
    expect(mocks.info).toHaveBeenCalledTimes(1);
  });

  it("does not change names when prefix cleanup is cancelled", () => {
    const refresh = vi.fn();
    render(<ClientCleanupActions onNamesCleaned={refresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar sinais no início dos nomes" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});