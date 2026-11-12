import { useEffect, useMemo, useState } from "react";
import { Users, Search, RefreshCw, ChevronLeft, ChevronRight, History, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAllPages } from "@/lib/agendaClients";
import { groupRouletteClients, hasRoulettePrize, matchesRouletteClient, matchesRouletteFilter, roulettePrizeLabel, rouletteRecordStatus, type RouletteClient } from "@/lib/rouletteClientHistory";

const PAGE_SIZE = 50;
const formatDate = (date: string | null) => date ? new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function AdminRouletteClients() {
  const [clients, setClients] = useState<RouletteClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [profiles, records] = await Promise.all([
        fetchAllPages((from, to) => supabase.from("profiles").select("user_id, full_name, phone").order("user_id").range(from, to)),
        fetchAllPages((from, to) => supabase.from("coupons").select("id, user_id, code, discount_type, discount_value, is_used, used_at, created_at, expires_at").or("code.like.BV-%,code.like.ANIV-%").order("created_at", { ascending: false }).order("id").range(from, to)),
      ]);
      if (profiles.error || records.error) throw profiles.error || records.error;
      setClients(groupRouletteClients(profiles.data ?? [], records.data ?? []));
    } catch { setError(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => clients.filter((client) => {
    if (!matchesRouletteClient(client, search)) return false;
    return matchesRouletteFilter(client, filter);
  }), [clients, search, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const opened = clients.find((client) => client.user_id === openedId);
  const summaries = [
    { key: "all", label: "Clientes" },
    { key: "winners", label: "Contemplados" },
    { key: "used", label: "Usados" },
    { key: "registered", label: "Registrados" },
  ];

  return <section className="space-y-5">
    <div className="flex items-center gap-3">
      <Users className="h-6 w-6 shrink-0 text-primary" />
      <h2 className="text-xl font-bold text-foreground">Clientes da Roleta</h2>
      <Button variant="outline" size="icon" className="ml-auto shrink-0" aria-label="Atualizar clientes da roleta" title="Atualizar" disabled={loading} onClick={() => void load()}><RefreshCw /></Button>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Resumo dos clientes da roleta">{summaries.map((summary) => <Button key={summary.key} variant={filter === summary.key ? "default" : "outline"} size="sm" aria-pressed={filter === summary.key} onClick={() => { setFilter(summary.key); setPage(1); }}>{summary.label}: {clients.filter((client) => matchesRouletteFilter(client, summary.key)).length}</Button>)}</div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar clientes da roleta" className="pl-9" placeholder="Nome, telefone ou ticket" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(1); }}><SelectTrigger className="sm:w-56" aria-label="Filtrar clientes da roleta"><SelectValue /></SelectTrigger><SelectContent className="z-[9999]"><SelectItem value="all">Todos os clientes</SelectItem><SelectItem value="winners">Já ganharam prêmios</SelectItem><SelectItem value="available">Com prêmio disponível</SelectItem><SelectItem value="used">Já usaram prêmios</SelectItem><SelectItem value="registered">Com giro registrado</SelectItem><SelectItem value="not-spun">Sem giro registrado</SelectItem></SelectContent></Select>
    </div>
    {loading ? <p role="status" className="py-10 text-center text-muted-foreground">Carregando clientes…</p> : error ? <div role="alert" className="space-y-3 py-10 text-center"><p className="text-destructive">Não foi possível carregar os clientes e seus históricos.</p><Button variant="outline" onClick={() => void load()}>Tentar novamente</Button></div> : <>
      {visible.length === 0 ? <p className="py-10 text-center text-muted-foreground">Nenhum cliente encontrado.</p> : <div className="divide-y divide-border border-y border-border">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_1fr_1fr_auto] gap-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid"><span>Cliente</span><span>Telefone</span><span>Prêmios / usados</span><span>Último registro</span><span>Histórico</span></div>
        {visible.map((client, index) => {
          const prizes = client.history.filter(hasRoulettePrize);
          return <div key={client.user_id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_1fr_1fr_auto] lg:items-center lg:gap-4">
            <div className="min-w-0"><p className="break-words font-semibold text-foreground"><span className="mr-2 text-sm font-normal text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + index + 1}.</span>{client.full_name}</p>{client.history.length === 0 && <span className="text-xs text-muted-foreground">Sem giro registrado</span>}</div>
            <p className={client.phone ? "text-sm text-foreground" : "text-sm text-destructive"}>{client.phone || "Sem telefone"}</p>
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-primary">{prizes.length}</span> prêmios · {prizes.filter((record) => record.is_used).length} usados</p>
            <p className="text-xs text-muted-foreground">{formatDate(client.history[0]?.created_at ?? null)}</p>
            <Button variant="outline" size="sm" className="w-fit" aria-label={`Ver histórico de ${client.full_name}`} onClick={() => setOpenedId(client.user_id)}><History className="h-4 w-4" />Histórico</Button>
          </div>;
        })}
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"><span>{filtered.length} clientes · Página {currentPage} de {pages}</span><div className="flex gap-2"><Button variant="outline" size="icon" title="Página anterior" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" title="Próxima página" aria-label="Próxima página" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div></div>
    </>}
    {opened && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenedId(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="roulette-client-title" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background p-5 text-foreground">
        <div className="mb-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 id="roulette-client-title" className="break-words text-lg font-semibold">{opened.full_name}</h3><p className="text-sm text-muted-foreground">{opened.phone || "Sem telefone"}</p></div><Button variant="ghost" size="icon" className="shrink-0" aria-label="Fechar histórico" onClick={() => setOpenedId(null)}><X /></Button></div>
        <h4 className="mb-3 font-semibold">Histórico de roletas</h4>
        {opened.history.length === 0 ? <p className="py-6 text-muted-foreground">Nenhum giro registrado para este cliente.</p> : <div className="divide-y divide-border">{opened.history.map((record) => <article key={record.id} className="space-y-2 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{roulettePrizeLabel(record)}</p><Badge variant={rouletteRecordStatus(record) === "Disponível" ? "default" : "secondary"}>{rouletteRecordStatus(record)}</Badge></div>
          <p className="text-sm text-muted-foreground">{record.code.startsWith("ANIV-") ? "Aniversário" : "Boas-vindas"} · {formatDate(record.created_at)}</p>
          <p className="break-all font-mono text-sm">{record.code}</p>
          {hasRoulettePrize(record) && <p className="text-xs text-muted-foreground">Validade: {formatDate(record.expires_at)}{record.is_used ? ` · Uso: ${formatDate(record.used_at)}` : ""}</p>}
        </article>)}</div>}
      </div>
    </div>}
  </section>;
}