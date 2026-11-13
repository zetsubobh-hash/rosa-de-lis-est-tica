import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import MeusCuidados from "@/components/MeusCuidados";
import { classifyClientAppointments, type ClientCareFilter } from "@/lib/clientCare";
import { CalendarClock, CheckCircle2, Users } from "lucide-react";

type Row = { user_id: string; full_name: string; phone: string };

const FILTERS: { key: ClientCareFilter; label: string; icon: typeof Users }[] = [
  { key: "all", label: "Todos", icon: Users },
  { key: "scheduled", label: "Agendados", icon: CalendarClock },
  { key: "finished", label: "Finalizados", icon: CheckCircle2 },
];

export default function AdminClientView() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sel, setSel] = useState<Row | null>(null);
  const [extra, setExtra] = useState<{ plans: any[]; coupons: any[] }>({ plans: [], coupons: [] });
  const [filter, setFilter] = useState<ClientCareFilter>("all");
  const [classified, setClassified] = useState<{ counts: Record<ClientCareFilter, number>; filterIds: (f: ClientCareFilter) => string[] }>({
    counts: { all: 0, scheduled: 0, finished: 0 },
    filterIds: () => [],
  });

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_admin_clients", { _search: q.trim() }).order("created_at", { ascending: false }).limit(30);
      if (error) console.error("Visão do Cliente:", error);
      const list = (data as Row[]) || [];
      setRows(list);
      const ids = list.map((r) => r.user_id);
      if (!ids.length) {
        setClassified({ counts: { all: 0, scheduled: 0, finished: 0 }, filterIds: () => [] });
        return;
      }
      const { data: appts } = await supabase
        .from("appointments")
        .select("user_id,status,appointment_date")
        .in("user_id", ids)
        .in("status", ["pending", "confirmed", "completed"]);
      const today = new Date().toLocaleDateString("en-CA");
      setClassified(classifyClientAppointments(ids, (appts as any[]) || [], today));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q]);

  const visibleIds = new Set(classified.filterIds(filter));
  const visibleRows = rows.filter((r) => visibleIds.has(r.user_id));

  useEffect(() => {
    if (!sel) return;
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("client_plans").select("id,plan_name,service_title,completed_sessions,total_sessions,status").eq("user_id", sel.user_id).in("status", ["active", "completed"]),
        supabase.from("coupons").select("id,code,discount_type,discount_value,expires_at").eq("user_id", sel.user_id).eq("is_used", false).gte("expires_at", new Date().toISOString()),
      ]);
      setExtra({ plans: p.data || [], coupons: c.data || [] });
    })();
  }, [sel]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Visão do Cliente</h2>
        <p className="font-body text-sm text-muted-foreground">Veja o que a cliente enxerga ao entrar no app (somente leitura).</p>
      </div>
      <Input placeholder="Buscar cliente por nome ou telefone — ou escolha na lista abaixo" value={q} onChange={(e) => setQ(e.target.value)} />
      {!sel && (
        <div className="grid grid-cols-3 gap-2">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl border p-3 text-left transition-colors ${filter === key ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}
            >
              <Icon className={`h-4 w-4 mb-1 ${filter === key ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-heading text-lg font-bold text-foreground">{classified.counts[key]}</p>
              <p className="font-body text-xs text-muted-foreground">{label}</p>
            </button>
          ))}
        </div>
      )}
      {!sel && visibleRows.length === 0 && <p className="font-body text-sm text-muted-foreground">Nenhuma cliente encontrada.</p>}
      {visibleRows.length > 0 && !sel && (
        <div className="rounded-xl border border-border divide-y divide-border">
          {visibleRows.map((r) => (
            <button key={r.user_id} onClick={() => setSel(r)} className="w-full text-left px-4 py-2 font-body text-sm hover:bg-muted">
              {r.full_name} <span className="text-muted-foreground">· {r.phone}</span>
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div className="max-w-2xl rounded-2xl border border-primary/30 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-heading font-bold text-foreground">Vendo como: {sel.full_name}</p>
            <button className="font-body text-sm text-primary" onClick={() => { setSel(null); setQ(""); }}>Trocar cliente</button>
          </div>
          <MeusCuidados key={sel.user_id} userId={sel.user_id} readOnly />
          <h3 className="font-heading font-bold text-foreground mb-2">Meus Pacotes</h3>
          {extra.plans.length ? extra.plans.map((p) => (
            <p key={p.id} className="font-body text-sm text-foreground">{p.service_title} — {p.completed_sessions}/{p.total_sessions} sessões</p>
          )) : <p className="font-body text-sm text-muted-foreground">Nenhum pacote.</p>}
          <h3 className="font-heading font-bold text-foreground mt-4 mb-2">Meus Brindes</h3>
          {extra.coupons.length ? extra.coupons.map((c) => (
            <p key={c.id} className="font-body text-sm text-foreground">{c.code} · válido até {new Date(c.expires_at).toLocaleDateString("pt-BR")}</p>
          )) : <p className="font-body text-sm text-muted-foreground">Nenhum brinde ativo.</p>}
        </div>
      )}
    </div>
  );
}
