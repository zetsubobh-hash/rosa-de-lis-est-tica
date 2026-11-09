import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PartnerFinancialReset from "./PartnerFinancialReset";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
describe("partner financial reset", () => {
  beforeEach(() => vi.clearAllMocks());
  it("requires a password and sends only the selected partner to the protected operation", async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const onReset = vi.fn();
    render(<PartnerFinancialReset partnerId="selected-partner" partnerName="Parceiro" onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar dados financeiros" }));
    expect(screen.getByRole("button", { name: "Confirmar limpeza" })).toBeDisabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Senha do administrador"), { target: { value: "test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledWith("reset-partner-financials", { body: { partner_id: "selected-partner", password: "test-password" } });
  });
  it("does not clear or refresh financial values if the server refuses the password", async () => {
    mocks.invoke.mockResolvedValue({ data: { error: "Senha incorreta" }, error: null });
    const onReset = vi.fn();
    render(<PartnerFinancialReset partnerId="selected-partner" partnerName="Parceiro" onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar dados financeiros" }));
    fireEvent.change(screen.getByLabelText("Senha do administrador"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar limpeza" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(onReset).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Senha do administrador")).toHaveValue("");
  });
  it("cancels without calling the operation", () => {
    render(<PartnerFinancialReset partnerId="selected-partner" partnerName="Parceiro" onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar dados financeiros" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar limpeza" }));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});