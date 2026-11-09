import { describe, expect, it } from "vitest";
import { fetchAllPages, matchesClientName } from "./agendaClients";

describe("agenda client search", () => {
  it("finds clients beyond the first 1000 records", async () => {
    const clients = Array.from({ length: 4305 }, (_, i) => ({
      user_id: String(i), full_name: i === 4304 ? "Zenite Costa" : `Cliente ${i}`,
    }));
    const ranges: number[][] = [];
    const result = await fetchAllPages((from, to) => {
      ranges.push([from, to]);
      return Promise.resolve({ data: clients.slice(from, to + 1), error: null });
    });
    expect(result.data).toHaveLength(4305);
    expect(ranges).toHaveLength(9);
    expect(result.data?.filter(c => matchesClientName(c.full_name, "Zenite Costa")))
      .toEqual([{ user_id: "4304", full_name: "Zenite Costa" }]);
  });

  it("matches names regardless of accents, case, extra spaces or omitted middle names", () => {
    expect(matchesClientName("Fabrício de Almeida", "  FABRICIO   almeida ")).toBe(true);
    expect(matchesClientName("Alisson Luiz", "Luiz")).toBe(true);
    expect(matchesClientName("Kevin Costa", "Alisson")).toBe(false);
  });

  it("does not report an incomplete directory as successful after a failed page", async () => {
    const error = { message: "connection failed" };
    const result = await fetchAllPages((from) => Promise.resolve(from === 0
      ? { data: Array.from({ length: 500 }, (_, i) => i), error: null }
      : { data: null, error }));
    expect(result).toEqual({ data: null, error });
  });
});