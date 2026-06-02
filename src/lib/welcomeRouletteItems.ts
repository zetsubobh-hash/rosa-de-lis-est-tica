export type RouletteItemType = "discount" | "none" | "service";

export interface RouletteItem {
  id: string;
  label: string;
  type: RouletteItemType;
  value: number; // percent (only for discount)
  weight: number; // relative chance
  enabled: boolean;
  expiresDays: number; // validity in days for the generated coupon
  serviceSlug?: string; // when type === 'service'
  serviceTitle?: string; // cached for display
}

export const DEFAULT_EXPIRES_DAYS = 30;

export const DEFAULT_ITEMS: RouletteItem[] = [
  { id: "1", label: "10% OFF", type: "discount", value: 10, weight: 10, enabled: true, expiresDays: 30 },
  { id: "2", label: "Não foi dessa vez", type: "none", value: 0, weight: 15, enabled: true, expiresDays: 30 },
  { id: "3", label: "15% OFF", type: "discount", value: 15, weight: 8, enabled: true, expiresDays: 30 },
  { id: "4", label: "Tente na próxima", type: "none", value: 0, weight: 15, enabled: true, expiresDays: 30 },
  { id: "5", label: "20% OFF", type: "discount", value: 20, weight: 5, enabled: true, expiresDays: 30 },
  { id: "6", label: "Quase!", type: "none", value: 0, weight: 12, enabled: true, expiresDays: 30 },
  { id: "7", label: "30% OFF", type: "discount", value: 30, weight: 2, enabled: true, expiresDays: 30 },
  { id: "8", label: "Não foi dessa vez", type: "none", value: 0, weight: 15, enabled: true, expiresDays: 30 },
  { id: "9", label: "Que pena!", type: "none", value: 0, weight: 10, enabled: true, expiresDays: 30 },
  { id: "10", label: "Tente na próxima", type: "none", value: 0, weight: 8, enabled: true, expiresDays: 30 },
];

export const ITEM_COLORS = [
  "hsl(340, 82%, 52%)",
  "hsl(0, 0%, 45%)",
  "hsl(200, 80%, 50%)",
  "hsl(0, 0%, 40%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 0%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(0, 0%, 42%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 0%, 48%)",
  "hsl(15, 80%, 55%)",
  "hsl(0, 0%, 38%)",
];

const normalizeType = (t: any): RouletteItemType => {
  if (t === "discount") return "discount";
  if (t === "service") return "service";
  return "none";
};

export const parseItems = (raw: string | null | undefined): RouletteItem[] => {
  if (!raw) return DEFAULT_ITEMS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: any, i: number) => ({
        id: String(p.id ?? i + 1),
        label: String(p.label ?? "Prêmio"),
        type: normalizeType(p.type),
        value: Number(p.value) || 0,
        weight: Math.max(0, Number(p.weight) || 0),
        enabled: p.enabled !== false,
        expiresDays: Math.max(1, Number(p.expiresDays) || DEFAULT_EXPIRES_DAYS),
        serviceSlug: p.serviceSlug || undefined,
        serviceTitle: p.serviceTitle || undefined,
      }));
    }
  } catch {}
  return DEFAULT_ITEMS;
};

export const computeChances = (items: RouletteItem[]) => {
  const active = items.filter((i) => i.enabled && i.weight > 0);
  const total = active.reduce((sum, i) => sum + i.weight, 0);
  return items.map((i) => ({
    ...i,
    chance: i.enabled && i.weight > 0 && total > 0 ? (i.weight / total) * 100 : 0,
  }));
};

export const pickWinnerIndex = (items: RouletteItem[]): number => {
  const totals: { idx: number; weight: number }[] = [];
  items.forEach((it, idx) => {
    if (it.enabled && it.weight > 0) totals.push({ idx, weight: it.weight });
  });
  if (totals.length === 0) return 0;
  const sum = totals.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * sum;
  for (const t of totals) {
    r -= t.weight;
    if (r <= 0) return t.idx;
  }
  return totals[totals.length - 1].idx;
};
