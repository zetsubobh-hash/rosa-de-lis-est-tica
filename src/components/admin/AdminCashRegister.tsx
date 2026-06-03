import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Clock, CreditCard, Banknote, QrCode, Receipt, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Users, BadgePercent, ChevronDown, CheckCircle2, CalendarClock, Search, Trash2, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/hooks/useServicePrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RangeKey = "day" | "15d" | "month" | "30d";

interface PaymentRow {
  id: string;
  user_id: string;
  appointment_id: string | null;
  method: string;
  amount_cents: number | null;
  status: string;
  created_at: string;
  metadata: any;
}

interface PartnerPaymentRow {
  id: string;
  partner_id: string;
  amount_cents: number;
  type: string;
  description: string;
  paid_at: string;
}

interface AppointmentRow {
  id: string;
  user_id: string;
  service_slug: string;
  service_title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  partner_id: string | null;
}

interface CashExpenseRow {
  id: string;
  category: string;
  description: string;
  amount_cents: number;
  payment_method: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  { value: "expediente", label: "Expediente" },
  { value: "materiais", label: "Materiais / Insumos" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet / Telefone" },
  { value: "aluguel", label: "Aluguel" },
  { value: "marketing", label: "Marketing" },
  { value: "manutencao", label: "Manutenção" },
  { value: "impostos", label: "Impostos / Taxas" },
  { value: "outros", label: "Outros" },
];


interface ServicePriceRow {
  service_slug: string;
  plan_name: string;
  price_per_session_cents: number;
}

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  outro: "Outro",
  mercadopago: "Mercado Pago",
};

const METHOD_ICON: Record<string, typeof CreditCard> = {
  pix: QrCode,
  dinheiro: Banknote,
  credito: CreditCard,
  debito: CreditCard,
  mercadopago: QrCode,
  outro: Receipt,
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  failed: { label: "Falhou", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  refunded: { label: "Estornado", cls: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
};

const APT_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  completed: { label: "Realizado", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  confirmed: { label: "Confirmado", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  cancelled: { label: "Cancelado", cls: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300" },
};

const getRange = (key: RangeKey): { start: Date; end: Date; label: string } => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (key === "day") {
    start.setHours(0, 0, 0, 0);
    return { start, end, label: format(now, "dd/MM/yyyy", { locale: ptBR }) };
  }
  if (key === "15d") {
    start.setDate(now.getDate() - 14);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "Últimos 15 dias" };
  }
  if (key === "30d") {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: "Últimos 30 dias" };
  }
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: format(now, "MMMM yyyy", { locale: ptBR }) };
};

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

const getAptPriceCents = (apt: AppointmentRow, prices: ServicePriceRow[]): number => {
  if (apt.notes) {
    try {
      const noteData = JSON.parse(apt.notes);
      if (typeof noteData.price_cents === "number") return noteData.price_cents;
    } catch { /* ignore */ }
  }
  const ess = prices.find(p => p.service_slug === apt.service_slug && p.plan_name === "Essencial");
  if (ess) return ess.price_per_session_cents;
  const any = prices.find(p => p.service_slug === apt.service_slug);
  return any?.price_per_session_cents || 0;
};

const KPICard = ({ icon: Icon, label, value, trend, color = "primary" }: { icon: any; label: string; value: string; trend?: string; color?: "primary" | "emerald" | "amber" | "red" | "slate" | "sky" }) => {
  const colorMap: Record<string, string> = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "from-red-500/10 to-red-500/5 text-red-600 dark:text-red-400 border-red-500/20",
    slate: "from-slate-500/10 to-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/20",
    sky: "from-sky-500/10 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colorMap[color]} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-body text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</p>
          <p className="font-heading text-xl md:text-2xl font-bold mt-1 truncate">{value}</p>
          {trend && <p className="font-body text-[10px] opacity-70 mt-1">{trend}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl bg-background/60 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
};

const AdminCashRegister = () => {
  const [range, setRange] = useState<RangeKey>("day");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [partnerPayments, setPartnerPayments] = useState<PartnerPaymentRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePriceRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [partners, setPartners] = useState<Map<string, string>>(new Map());
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  // Quick entry modal
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryClientId, setEntryClientId] = useState<string>("");
  const [entryAmount, setEntryAmount] = useState<string>("");
  const [entryMethod, setEntryMethod] = useState<string>("pix");
  const [entryStatus, setEntryStatus] = useState<"paid" | "pending">("paid");
  const [entryDescription, setEntryDescription] = useState<string>("");
  const [savingEntry, setSavingEntry] = useState(false);

  const { start, end, label } = useMemo(() => getRange(range), [range]);

  const loadData = async () => {
    setLoading(true);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const startYmd = toYmd(start);
    const endYmd = toYmd(end);
    const [payRes, ppRes, aptRes, spRes, profRes, partRes] = await Promise.all([
      supabase
        .from("payments")
        .select("id, user_id, appointment_id, method, amount_cents, status, created_at, metadata")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("partner_payments")
        .select("id, partner_id, amount_cents, type, description, paid_at")
        .gte("paid_at", startIso)
        .lte("paid_at", endIso)
        .order("paid_at", { ascending: false })
        .limit(1000),
      supabase
        .from("appointments")
        .select("id, user_id, service_slug, service_title, appointment_date, appointment_time, status, notes, partner_id")
        .gte("appointment_date", startYmd)
        .lte("appointment_date", endYmd)
        .neq("status", "cancelled")
        .order("appointment_date", { ascending: false })
        .limit(1000),
      supabase.from("service_prices").select("service_slug, plan_name, price_per_session_cents"),
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("partners").select("id, full_name"),
    ]);
    setPayments((payRes.data || []) as PaymentRow[]);
    setPartnerPayments((ppRes.data || []) as PartnerPaymentRow[]);
    setAppointments((aptRes.data || []) as AppointmentRow[]);
    setServicePrices((spRes.data || []) as ServicePriceRow[]);
    const pm = new Map<string, string>();
    (profRes.data || []).forEach((p: any) => pm.set(p.user_id, p.full_name));
    setProfiles(pm);
    const ptm = new Map<string, string>();
    (partRes.data || []).forEach((p: any) => ptm.set(p.id, p.full_name));
    setPartners(ptm);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Annotate each appointment with computed price
  const aptWithPrice = useMemo(() => {
    return appointments.map(a => ({ ...a, price_cents: getAptPriceCents(a, servicePrices) }));
  }, [appointments, servicePrices]);

  // Virtual receivables: appointments without any payment row linked
  const virtualReceivables = useMemo(() => {
    const linked = new Set(payments.map(p => p.appointment_id).filter(Boolean) as string[]);
    return aptWithPrice
      .filter(a => a.status !== "cancelled" && !linked.has(a.id) && a.price_cents > 0)
      .map(a => ({ id: `virt-${a.id}`, user_id: a.user_id, amount_cents: a.price_cents, service_title: a.service_title, appointment_date: a.appointment_date, appointment_time: a.appointment_time }));
  }, [aptWithPrice, payments]);

  const parseAmount = (raw: string): number => {
    const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100);
    return 0;
  };

  const resetEntry = () => {
    setEntryOpen(false);
    setEntryClientId("");
    setEntryAmount("");
    setEntryMethod("pix");
    setEntryStatus("paid");
    setEntryDescription("");
  };

  const openQuickEntry = (clientId: string, amountCents: number, description?: string) => {
    setEntryClientId(clientId);
    setEntryAmount(amountCents > 0 ? (amountCents / 100).toFixed(2).replace(".", ",") : "");
    setEntryMethod("pix");
    setEntryStatus("paid");
    setEntryDescription(description?.slice(0, 200) || "");
    setEntryOpen(true);
  };


  const handleSaveEntry = async () => {
    if (!entryClientId) { return; }
    const amount = parseAmount(entryAmount);
    if (amount <= 0) { return; }
    setSavingEntry(true);
    const { error } = await supabase.from("payments").insert({
      user_id: entryClientId,
      method: entryMethod,
      amount_cents: amount,
      status: entryStatus,
      metadata: { source: "cash_register_entry", description: entryDescription.trim().slice(0, 200) || null },
    });
    setSavingEntry(false);
    if (error) return;
    resetEntry();
    loadData();
  };

  // KPIs — payment-centric (real cash)
  const totals = useMemo(() => {
    const paidPayments = payments.filter(p => p.status === "paid");
    const pendingPayments = payments.filter(p => p.status === "pending");
    const refundedSum = payments.filter(p => p.status === "refunded").reduce((s, p) => s + (p.amount_cents || 0), 0);

    const cashIn = paidPayments.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const pendingRecorded = pendingPayments.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const virtualSum = virtualReceivables.reduce((s, v) => s + v.amount_cents, 0);
    const receivables = pendingRecorded + virtualSum;

    const expenses = partnerPayments.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const net = cashIn - expenses - refundedSum;
    const transactions = paidPayments.length;
    const avgTicket = transactions > 0 ? Math.round(cashIn / transactions) : 0;
    return {
      cashIn, pendingRecorded, virtualSum, receivables, refundedSum, expenses, net,
      transactions, avgTicket,
      paidCount: paidPayments.length, pendingCount: pendingPayments.length + virtualReceivables.length,
    };
  }, [payments, partnerPayments, virtualReceivables]);

  // By method
  const byMethod = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    payments.filter(p => p.status === "paid").forEach(p => {
      const cur = map.get(p.method) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += p.amount_cents || 0;
      map.set(p.method, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [payments]);

  // Daily series — paid cash inflow vs receivables
  const byDay = useMemo(() => {
    const map = new Map<string, { realized: number; scheduled: number }>();
    payments.forEach(p => {
      const d = format(new Date(p.created_at), "dd/MM");
      const cur = map.get(d) || { realized: 0, scheduled: 0 };
      if (p.status === "paid") cur.realized += p.amount_cents || 0;
      else if (p.status === "pending") cur.scheduled += p.amount_cents || 0;
      map.set(d, cur);
    });
    virtualReceivables.forEach(v => {
      const [, mo, day] = v.appointment_date.split("-");
      const key = `${day}/${mo}`;
      const cur = map.get(key) || { realized: 0, scheduled: 0 };
      cur.scheduled += v.amount_cents;
      map.set(key, cur);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma === mb ? da - db : ma - mb;
    });
  }, [payments, virtualReceivables]);

  const maxDaily = useMemo(() => Math.max(1, ...byDay.map(([, v]) => v.realized + v.scheduled)), [byDay]);

  // Per-client aggregation (the core fix)
  const byClient = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      name: string;
      realized: number;
      scheduled: number;
      paid: number;
      pending: number;
      appointments: (AppointmentRow & { price_cents: number })[];
      payments: PaymentRow[];
    }>();

    aptWithPrice.forEach(a => {
      const cur = map.get(a.user_id) || {
        userId: a.user_id,
        name: profiles.get(a.user_id) || "Cliente",
        realized: 0, scheduled: 0, paid: 0, pending: 0,
        appointments: [], payments: [],
      };
      if (a.status === "completed") cur.realized += a.price_cents;
      else cur.scheduled += a.price_cents;
      cur.appointments.push(a);
      map.set(a.user_id, cur);
    });

    payments.forEach(p => {
      const cur = map.get(p.user_id) || {
        userId: p.user_id,
        name: profiles.get(p.user_id) || "Cliente",
        realized: 0, scheduled: 0, paid: 0, pending: 0,
        appointments: [], payments: [],
      };
      if (p.status === "paid") cur.paid += p.amount_cents || 0;
      if (p.status === "pending") cur.pending += p.amount_cents || 0;
      cur.payments.push(p);
      map.set(p.user_id, cur);
    });

    return Array.from(map.values())
      .map(c => ({ ...c, balance: c.realized - c.paid })) // unpaid balance from realized services
      .sort((a, b) => (b.realized + b.scheduled) - (a.realized + a.scheduled));
  }, [aptWithPrice, payments, profiles]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return byClient;
    return byClient.filter(c => c.name.toLowerCase().includes(q));
  }, [byClient, clientSearch]);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "day", label: "Hoje" },
    { key: "15d", label: "15 dias" },
    { key: "month", label: "Mês atual" },
    { key: "30d", label: "30 dias" },
  ];

  return (
    <div className="space-y-6">
      {/* Range Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <p className="font-body text-sm text-muted-foreground">
            Período: <span className="font-semibold text-foreground capitalize">{label}</span>
          </p>
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl bg-muted">
          {ranges.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-lg font-body text-xs font-semibold transition-all ${
                range === r.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEntryOpen(true)}
          className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-body text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Wallet className="w-3.5 h-3.5" /> Nova entrada
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <motion.div
            key={range}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <KPICard icon={TrendingUp} label="Receita (Caixa)" value={formatCents(totals.cashIn)} trend={`${totals.paidCount} pagamentos recebidos`} color="emerald" />
            <KPICard icon={Clock} label="A Receber" value={formatCents(totals.receivables)} trend={`${totals.pendingCount} pendências`} color="amber" />
            <KPICard icon={TrendingDown} label="Despesas" value={formatCents(totals.expenses)} trend={`${partnerPayments.length} pagamentos`} color="red" />
            <KPICard icon={Wallet} label="Saldo Líquido" value={formatCents(totals.net)} trend={`Ticket médio ${formatCents(totals.avgTicket)}`} color={totals.net >= 0 ? "primary" : "red"} />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard icon={CalendarClock} label="Pendente em pagamentos" value={formatCents(totals.pendingRecorded)} trend="Lançados como pendentes" color="amber" />
            <KPICard icon={CheckCircle2} label="Serviços sem lançamento" value={formatCents(totals.virtualSum)} trend={`${virtualReceivables.length} agendamentos`} color="sky" />
            <KPICard icon={BadgePercent} label="Estornos" value={formatCents(totals.refundedSum)} color="slate" />
          </div>

          {/* Daily Chart */}
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Fluxo Diário</h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-body">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Recebido</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> A receber</span>
              </div>
            </div>
            {byDay.length === 0 ? (
              <p className="text-center py-10 font-body text-sm text-muted-foreground">Sem serviços no período.</p>
            ) : (
              <div className="space-y-1.5">
                {byDay.map(([day, v]) => {
                  const r = (v.realized / maxDaily) * 100;
                  const s = (v.scheduled / maxDaily) * 100;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0">{day}</span>
                      <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${r}%` }} title={`Realizado: ${formatCents(v.realized)}`} />
                        <div className="h-full bg-sky-500 transition-all" style={{ width: `${s}%` }} title={`Agendado: ${formatCents(v.scheduled)}`} />
                      </div>
                      <span className="font-body text-[11px] text-foreground font-semibold w-20 text-right shrink-0">{formatCents(v.realized + v.scheduled)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By Method */}
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Caixa por forma de pagamento</h3>
            </div>
            {byMethod.length === 0 ? (
              <p className="text-center py-6 font-body text-sm text-muted-foreground">Sem pagamentos confirmados.</p>
            ) : (
              <div className="space-y-2">
                {byMethod.map(([method, v]) => {
                  const Icon = METHOD_ICON[method] || Receipt;
                  const pct = totals.cashIn > 0 ? (v.total / totals.cashIn) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                          <span className="font-body text-sm font-semibold text-foreground">{METHOD_LABEL[method] || method}</span>
                          <span className="text-[10px] text-muted-foreground">({v.count}x)</span>
                        </div>
                        <span className="font-body text-sm font-bold text-foreground">{formatCents(v.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Per-client breakdown */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Detalhamento por cliente ({byClient.length})</h3>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background font-body text-xs w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredClients.length === 0 && (
                <p className="text-center py-10 font-body text-sm text-muted-foreground">Nenhum cliente no período.</p>
              )}
              {filteredClients.map(c => {
                const isOpen = expandedClient === c.userId;
                const balance = c.realized - c.paid;
                return (
                  <div key={c.userId}>
                    <button
                      onClick={() => setExpandedClient(isOpen ? null : c.userId)}
                      className="w-full px-4 md:px-6 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {c.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body flex-wrap">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCents(c.realized)} realizado</span>
                          {c.scheduled > 0 && <><span>•</span><span className="text-sky-600 dark:text-sky-400">{formatCents(c.scheduled)} agendado</span></>}
                          {balance > 0 && <><span>•</span><span className="text-amber-600 dark:text-amber-400 font-semibold">{formatCents(balance)} em aberto</span></>}
                        </div>
                      </div>
                      <span className="font-heading text-sm font-bold text-foreground shrink-0">{formatCents(c.realized + c.scheduled)}</span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-muted/20"
                        >
                          <div className="px-4 md:px-6 py-3 space-y-3">
                            {/* Quick action: receive payment for this client */}
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => openQuickEntry(c.userId, Math.max(0, balance), `Pagamento — ${c.name}`)}
                                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
                              >
                                <Wallet className="w-3 h-3" />
                                {balance > 0 ? `Receber pagamento (${formatCents(balance)})` : "Receber pagamento"}
                              </button>
                            </div>
                            {c.appointments.length > 0 && (
                              <div>
                                <p className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Serviços ({c.appointments.length})</p>
                                <div className="space-y-1">
                                  {c.appointments.map(a => {
                                    const st = APT_STATUS_LABEL[a.status] || { label: a.status, cls: "bg-muted text-muted-foreground" };
                                    // Calculate already-paid against this appointment
                                    const aptPaid = c.payments
                                      .filter(p => p.appointment_id === a.id && (p.status === "paid" || p.status === "pending"))
                                      .reduce((s, p) => s + (p.amount_cents || 0), 0);
                                    const remaining = Math.max(0, a.price_cents - aptPaid);
                                    return (
                                      <div key={a.id} className="flex items-center gap-2 text-xs font-body p-1.5 rounded-md bg-background/60">
                                        <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0">{a.appointment_date.split("-").reverse().join("/")} {a.appointment_time}</span>
                                        <span className="flex-1 truncate text-foreground">{a.service_title}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                                        <span className="font-semibold text-foreground w-20 text-right">{formatCents(a.price_cents)}</span>
                                        {remaining > 0 ? (
                                          <button
                                            onClick={() => openQuickEntry(c.userId, remaining, a.service_title)}
                                            title={`Lançar pagamento (${formatCents(remaining)} em aberto)`}
                                            className="h-6 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 flex items-center gap-1 shrink-0"
                                          >
                                            <Wallet className="w-2.5 h-2.5" /> Lançar
                                          </button>
                                        ) : (
                                          <span className="h-6 px-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Pago
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {c.payments.length > 0 && (
                              <div>
                                <p className="font-body text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Pagamentos ({c.payments.length})</p>
                                <div className="space-y-1">
                                  {c.payments.map(p => {
                                    const st = STATUS_LABEL[p.status] || { label: p.status, cls: "bg-muted text-muted-foreground" };
                                    const Icon = METHOD_ICON[p.method] || Receipt;
                                    return (
                                      <div key={p.id} className="flex items-center gap-2 text-xs font-body p-1.5 rounded-md bg-background/60">
                                        <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0">{format(new Date(p.created_at), "dd/MM HH:mm")}</span>
                                        <Icon className="w-3 h-3 text-primary shrink-0" />
                                        <span className="flex-1 truncate text-foreground">{METHOD_LABEL[p.method] || p.method}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                                        <span className="font-semibold text-foreground w-20 text-right">{formatCents(p.amount_cents || 0)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-xs font-body">
                              <span className="text-muted-foreground">Total realizado: <span className="text-foreground font-bold">{formatCents(c.realized)}</span></span>
                              <span className="text-muted-foreground">Recebido: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCents(c.paid)}</span></span>
                              <span className="text-muted-foreground">Em aberto: <span className={`font-bold ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{formatCents(Math.max(0, balance))}</span></span>
                            </div>
                          </div>

                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transactions list (raw inflows + outflows) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Movimentações de caixa ({payments.length + partnerPayments.length})</h3>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {payments.length === 0 && partnerPayments.length === 0 && (
                <p className="text-center py-10 font-body text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
              )}
              {payments.map(p => {
                const st = STATUS_LABEL[p.status] || { label: p.status, cls: "bg-muted text-muted-foreground" };
                const Icon = METHOD_ICON[p.method] || Receipt;
                const name = profiles.get(p.user_id) || "Cliente";
                const applied = p.metadata?.applied_coupon;
                return (
                  <div key={p.id} className="px-4 md:px-6 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body text-sm font-semibold text-foreground truncate">{name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                        {applied && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary flex items-center gap-1">
                            <BadgePercent className="w-2.5 h-2.5" /> {applied.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body">
                        <Icon className="w-3 h-3" />
                        <span>{METHOD_LABEL[p.method] || p.method}</span>
                        <span>•</span>
                        <span>{format(new Date(p.created_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                    <span className="font-heading text-sm font-bold text-emerald-600 shrink-0">+{formatCents(p.amount_cents || 0)}</span>
                  </div>
                );
              })}
              {partnerPayments.map(p => {
                const name = partners.get(p.partner_id) || "Parceiro";
                return (
                  <div key={p.id} className="px-4 md:px-6 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body text-sm font-semibold text-foreground truncate">{name}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 capitalize">
                          {p.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body truncate">
                        <span>{p.description || "Pagamento parceiro"}</span>
                        <span>•</span>
                        <span>{format(new Date(p.paid_at), "dd/MM HH:mm")}</span>
                      </div>
                    </div>
                    <span className="font-heading text-sm font-bold text-red-600 shrink-0">-{formatCents(p.amount_cents)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Quick Entry Modal */}
      <AnimatePresence>
        {entryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) resetEntry(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" /> Nova entrada no caixa
                </h3>
                <button onClick={resetEntry} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Cliente</label>
                  <select
                    value={entryClientId}
                    onChange={(e) => setEntryClientId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Selecione o cliente…</option>
                    {Array.from(profiles.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([uid, name]) => (
                      <option key={uid} value={uid}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Valor (R$)</label>
                    <input
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="130,00"
                      inputMode="decimal"
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Método</label>
                    <select
                      value={entryMethod}
                      onChange={(e) => setEntryMethod(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Situação</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryStatus("paid")}
                      className={`flex-1 h-9 rounded-md text-xs font-bold transition-colors ${entryStatus === "paid" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      Pago (entra no caixa)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryStatus("pending")}
                      className={`flex-1 h-9 rounded-md text-xs font-bold transition-colors ${entryStatus === "pending" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      A receber
                    </button>
                  </div>
                </div>
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Descrição (opcional)</label>
                  <input
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value.slice(0, 200))}
                    placeholder="Ex.: Massagem redutora"
                    maxLength={200}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/30">
                <button onClick={resetEntry} className="h-9 px-4 rounded-md border border-border text-xs font-bold hover:bg-muted">Cancelar</button>
                <button
                  onClick={handleSaveEntry}
                  disabled={!entryClientId || parseAmount(entryAmount) <= 0 || savingEntry}
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEntry ? <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Salvar entrada
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCashRegister;
