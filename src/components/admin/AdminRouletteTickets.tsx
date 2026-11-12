import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ticket, Search, Gift, Cake, CheckCircle2, Clock, XCircle } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  user_id: string;
  discount_type: string;
  discount_value: number;
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
};

type Filter = "all" | "available" | "used" | "expired";

const originOf = (code: string) =>
  code.startsWith("ANIV-") ? "Aniversário" : code.startsWith("BV-") ? "Boas-vindas" : "Roleta";

const prizeOf = (c: Coupon) =>
  c.code.startsWith("BV-NADA-")
    ? "Não ganhou"
    : c.discount_type === "service"
      ? "Sessão grátis"
      : c.discount_value >= 100
        ? "Sessão grátis"
        : `${c.discount_value}% OFF`;

const statusOf = (c: Coupon): "used" | "expired" | "available" =>
  c.is_used ? "used" : new Date(c.expires_at) < new Date() ? "expired" : "available";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

export default function AdminRouletteTickets() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all: Coupon[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("coupons")
          .select("id, code, user_id, discount_type, discount_value, is_used, used_at, expires_at, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error || !data?.length) break;
        all.push(...(data as Coupon[]));
        if (data.length < 1000) break;
        from += 1000;
      }
      setCoupons(all);
      const ids = [...new Set(all.map((c) => c.user_id))];
      const map: Record<string, string> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids.slice(i, i + 200));
        profs?.forEach((p) => { map[p.user_id] = p.full_name; });
      }
      setNames(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((c) => {
      if (filter !== "all" && statusOf(c) !== filter) return false;
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || (names[c.user_id] || "").toLowerCase().includes(q);
    });
  }, [coupons, names, search, filter]);

  const counts = useMemo(() => ({
    all: coupons.length,
    available: coupons.filter((c) => statusOf(c) === "available").length,
    used: coupons.filter((c) => c.is_used).length,
    expired: coupons.filter((c) => statusOf(c) === "expired").length,
  }), [coupons]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: counts.all },
    { key: "available", label: "Disponíveis", count: counts.available },
    { key: "used", label: "Usados", count: counts.used },
    { key: "expired", label: "Expirados", count: counts.expired },
  ];

  const statusBadge = (c: Coupon) => {
    const s = statusOf(c);
    if (s === "used")
      return <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600"><CheckCircle2 className="h-3 w-3" />Usado</Badge>;
    if (s === "expired")
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Expirado</Badge>;
    return <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary"><Clock className="h-3 w-3" />Disponível</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5"><Ticket className="h-6 w-6 text-primary" /></div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tickets da Roleta</h2>
          <p className="text-sm text-muted-foreground">Prêmios sorteados por cada cliente e se já foram usados</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente ou número do ticket..." className="pl-9" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Nenhum ticket encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{names[c.user_id] || "Cliente"}</p>
                <p className="font-mono text-sm text-muted-foreground">{c.code}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {originOf(c.code) === "Aniversário" ? <Cake className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
                  {originOf(c.code)}
                </span>
                <span className="font-medium text-foreground">{prizeOf(c)}</span>
                <span className="text-muted-foreground">Validade: {fmtDate(c.expires_at)}</span>
                {c.is_used && <span className="text-muted-foreground">Usado em: {fmtDate(c.used_at)}</span>}
                {statusBadge(c)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
