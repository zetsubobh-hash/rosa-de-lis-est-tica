import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { format } from "date-fns";
import DayTimelineView from "./DayTimelineView";

function AgendaHarness() {
  const [date, setDate] = useState(new Date(2026, 10, 12));
  return <>
    <output aria-label="Data selecionada">{format(date, "yyyy-MM-dd")}</output>
    <DayTimelineView appointments={[]} timelineDate={format(date, "yyyy-MM-dd")} onToday={setDate} />
  </>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("retorno da agenda ao dia atual", () => {
  it("troca a data do dia seguinte pela data atual ao clicar em Hoje", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 11, 10, 30));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<AgendaHarness />);
    expect(screen.getByLabelText("Data selecionada")).toHaveTextContent("2026-11-12");
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(screen.getByLabelText("Data selecionada")).toHaveTextContent("2026-11-11");
  });

  it("usa a data local no momento do clique, mesmo após a meia-noite", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 23, 59));
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const onToday = vi.fn();
    render(<DayTimelineView appointments={[]} timelineDate="2026-11-12" onToday={onToday} />);
    vi.setSystemTime(new Date(2026, 10, 11, 0, 1));
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(onToday).toHaveBeenCalledWith(new Date(2026, 10, 11, 0, 0));
  });
});