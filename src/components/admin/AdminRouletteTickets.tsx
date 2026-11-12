import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveRouletteTicket, deleteRouletteTickets } from "@/lib/rouletteTicketManagement";
import { Ticket, Search, Gift, Cake, CheckCircle2, Clock, XCircle, Pencil, Trash2, X, RefreshCw } from "lucide-react";

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
  used_appointment_id: string | null;
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

const localInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminRouletteTickets() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [draft, setDraft] = useState({ code: "", type: "percent", value: "", expires: "", used: false, usedAt: "" });
  const [deleting, setDeleting] = useState<Coupon[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadTickets = async () => {
      setLoading(true);
      setLoadError(false);
      try {
      const all: Coupon[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("coupons")
          .select("id, code, user_id, discount_type, discount_value, is_used, used_at, expires_at, created_at, used_appointment_id")
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...(data as Coupon[]));
        if (data.length < 1000) break;
        from += 1000;
      }
      setCoupons(all);
      const ids = [...new Set(all.map((c) => c.user_id))];
      const map: Record<string, string> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data: profs, error } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids.slice(i, i + 200));
        if (error) throw error;
        profs?.forEach((p) => { map[p.user_id] = p.full_name; });
      }
      setNames(map);
      setSelected((old) => old.filter((id) => all.some((c) => c.id === id)));
      } catch {
        setLoadError(true);
        toast.error("Não foi possível carregar os tickets. Tente atualizar.");
      } finally { setLoading(false); }
  };
  useEffect(() => {
    void loadTickets();
  }, []);

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setDraft({ code: c.code, type: c.discount_type, value: String(c.discount_value), expires: localInput(c.expires_at), used: c.is_used, usedAt: c.used_at ? localInput(c.used_at) : "" });
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || busy) return;
    const value = Number(draft.value.replace(",", "."));
    if (!draft.code.trim() || !draft.expires || !Number.isFinite(value) || value < 0 || (draft.type === "percent" && value > 100) || (draft.used && !draft.usedAt)) {
      toast.error("Confira código, prêmio, validade e data de uso. Desconto percentual deve estar entre 0 e 100.");
      return;
    }
    setBusy(true);
    try {
      await saveRouletteTicket(editing.id, {
        code: draft.code.trim().toUpperCase(), discount_type: draft.type, discount_value: value,
        expires_at: new Date(draft.expires).toISOString(), is_used: draft.used,
        used_at: draft.used ? new Date(draft.usedAt).toISOString() : null,
        ...(!draft.used ? { used_appointment_id: null } : {}),
      });
      setEditing(null);
      toast.success("Ticket atualizado.");
      await loadTickets();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o ticket."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || !deleting.length) return;
    setBusy(true);
    try {
      await deleteRouletteTickets(deleting.map((c) => c.id));
      setDeleting([]);
      toast.success("Tickets excluídos.");
      await loadTickets();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível excluir os tickets."); }
    finally { setBusy(false); }
  };

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
      return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Usado</Badge>;
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
        </div>
        <Button variant="outline" size="icon" className="ml-auto shrink-0" aria-label="Atualizar tickets" title="Atualizar tickets" onClick={() => void loadTickets()} disabled={loading || busy}><RefreshCw /></Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente ou número do ticket..." className="pl-9" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            onClick={() => setFilter(f.key)}
            size="sm" variant={filter === f.key ? "default" : "secondary"}
          >
            {f.label} ({f.count})
          </Button>
        ))}
      </div>

      {!loading && !loadError && filtered.length > 0 && <div className="flex flex-wrap items-center gap-3">
        <Checkbox id="all-tickets" checked={filtered.every((c) => selected.includes(c.id))} onCheckedChange={(checked) => setSelected((old) => checked ? [...new Set([...old, ...filtered.map((c) => c.id)])] : old.filter((id) => !filtered.some((c) => c.id === id)))} />
        <Label htmlFor="all-tickets">Selecionar resultados ({filtered.length})</Label>
        {selected.length > 0 && <><span className="text-sm text-muted-foreground">{selected.length} selecionados</span><Button variant="destructive" size="sm" onClick={() => setDeleting(coupons.filter((c) => selected.includes(c.id)))} disabled={busy}><Trash2 />Excluir selecionados</Button><Button variant="ghost" size="sm" onClick={() => setSelected([])}>Limpar seleção</Button></>}
      </div>}

      {loadError ? <p className="py-8 text-center text-destructive">Não foi possível carregar a lista. Clique em atualizar.</p> : loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Nenhum ticket encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:p-4">
              <Checkbox aria-label={`Selecionar ticket ${c.code}`} checked={selected.includes(c.id)} onCheckedChange={(checked) => setSelected((old) => checked ? [...old, c.id] : old.filter((id) => id !== c.id))} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{names[c.user_id] || "Cliente"}</p>
                <p className="break-all font-mono text-sm text-muted-foreground">{c.code}</p>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  {originOf(c.code) === "Aniversário" ? <Cake className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
                  {originOf(c.code)}
                </span>
                <span className="font-medium text-foreground">{prizeOf(c)}</span>
                <span className="text-muted-foreground">Validade: {fmtDate(c.expires_at)}</span>
                {c.is_used && <span className="text-muted-foreground">Usado em: {fmtDate(c.used_at)}</span>}
                {statusBadge(c)}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="icon" aria-label={`Editar ticket ${c.code}`} title="Editar ticket" disabled={busy} onClick={() => openEdit(c)}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Excluir ticket ${c.code}`} title="Excluir ticket" disabled={busy} onClick={() => setDeleting([c])}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(editing || deleting.length > 0) && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) { setEditing(null); setDeleting([]); } }}>
        <div role="dialog" aria-modal="true" aria-labelledby="ticket-dialog-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-5 text-foreground">
          <div className="mb-4 flex items-center justify-between gap-2"><h3 id="ticket-dialog-title" className="text-lg font-semibold">{editing ? "Editar ticket" : "Excluir tickets?"}</h3><Button variant="ghost" size="icon" aria-label="Fechar" disabled={busy} onClick={() => { setEditing(null); setDeleting([]); }}><X /></Button></div>
          {editing ? <form className="space-y-4" onSubmit={save}>
            <p className="font-medium">{names[editing.user_id] || "Cliente"}</p>
            <div className="space-y-2"><Label htmlFor="ticket-code">Número do ticket</Label><Input id="ticket-code" required maxLength={100} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="ticket-type">Tipo de prêmio</Label><select id="ticket-type" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, value: e.target.value === "service" ? "100" : draft.value })}><option value="percent">Desconto percentual (%)</option><option value="fixed">Desconto em valor</option><option value="service">Sessão grátis</option>{!["percent", "fixed", "service"].includes(draft.type) && <option value={draft.type}>{draft.type}</option>}</select></div>
            {draft.type !== "service" && <div className="space-y-2"><Label htmlFor="ticket-value">{draft.type === "percent" ? "Desconto (%)" : "Valor do desconto"}</Label><Input id="ticket-value" inputMode="decimal" required value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></div>}
            <div className="space-y-2"><Label htmlFor="ticket-expires">Validade</Label><Input id="ticket-expires" type="datetime-local" required value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Checkbox id="ticket-used" checked={draft.used} onCheckedChange={(checked) => setDraft({ ...draft, used: checked === true, usedAt: draft.usedAt || localInput(new Date().toISOString()) })} /><Label htmlFor="ticket-used">Ticket usado</Label></div>
            {draft.used && <div className="space-y-2"><Label htmlFor="ticket-used-at">Data do uso</Label><Input id="ticket-used-at" type="datetime-local" required value={draft.usedAt} onChange={(e) => setDraft({ ...draft, usedAt: e.target.value })} /></div>}
            {editing.is_used && !draft.used && <p className="text-sm text-destructive">Desfazer o uso permite usar o ticket novamente se ainda estiver válido. Pagamentos anteriores não serão alterados.</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar"}</Button></div>
          </form> : <div className="space-y-4"><p>Excluir permanentemente {deleting.length} ticket(s)? Cadastros, fichas e pagamentos dos clientes serão mantidos.</p><ul className="max-h-40 space-y-1 overflow-y-auto text-sm">{deleting.map((c) => <li key={c.id} className="break-words">{names[c.user_id] || "Cliente"} — {c.code}</li>)}</ul><p className="text-sm text-destructive">Esta ação não pode ser desfeita.</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setDeleting([])}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? "Excluindo…" : "Confirmar exclusão"}</Button></div></div>}
        </div>
      </div>}
    </div>
  );
}
