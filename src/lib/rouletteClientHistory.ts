import { matchesClientName } from "./agendaClients";

export type RouletteRecord = {
  id: string; user_id: string; code: string; discount_type: string;
  discount_value: number; is_used: boolean; used_at: string | null;
  created_at: string; expires_at: string;
};
export type RouletteClient = { user_id: string; full_name: string; phone: string; history: RouletteRecord[] };

export const isRouletteRecord = (record: RouletteRecord) => /^(BV-|ANIV-)/.test(record.code);
export const hasRoulettePrize = (record: RouletteRecord) => !record.code.startsWith("BV-NADA-");
export function roulettePrizeLabel(record: RouletteRecord) {
  if (!hasRoulettePrize(record)) return "Sem prêmio";
  if (record.discount_type === "service" || record.code.startsWith("BV-SRV") || (record.discount_type === "percent" && record.discount_value === 100)) return "Sessão grátis";
  if (record.discount_type === "fixed") return `${record.discount_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} de desconto`;
  return `${record.discount_value}% de desconto`;
}
export function rouletteRecordStatus(record: RouletteRecord, now = Date.now()) {
  if (!hasRoulettePrize(record)) return "Sem prêmio";
  if (record.is_used) return "Usado";
  return new Date(record.expires_at).getTime() < now ? "Expirado" : "Disponível";
}
export function groupRouletteClients(profiles: Omit<RouletteClient, "history">[], records: RouletteRecord[]): RouletteClient[] {
  const clients = new Map(profiles.map((profile) => [profile.user_id, { ...profile, history: [] as RouletteRecord[] }]));
  for (const record of records.filter(isRouletteRecord)) {
    let client = clients.get(record.user_id);
    if (!client) {
      client = { user_id: record.user_id, full_name: "Cadastro não encontrado", phone: "", history: [] };
      clients.set(record.user_id, client);
    }
    client.history.push(record);
  }
  return [...clients.values()].map((client) => ({ ...client, history: client.history.sort((a, b) => b.created_at.localeCompare(a.created_at)) }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
}
export function matchesRouletteClient(client: RouletteClient, search: string) {
  if (!search.trim()) return true;
  const digits = search.replace(/\D/g, "");
  return matchesClientName(client.full_name, search) || (!!digits && /^[\d\s()+.\-]+$/.test(search) && client.phone.replace(/\D/g, "").includes(digits)) || client.history.some((record) => record.code.toLowerCase().includes(search.trim().toLowerCase()));
}