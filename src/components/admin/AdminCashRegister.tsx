import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Clock, CreditCard, Banknote, QrCode, Receipt, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Users, BadgePercent, ChevronDown, CheckCircle2, CalendarClock, Search, Trash2, Zap, AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/hooks/useServicePrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type RangeKey = "day" | "15d" | "month" | "30d" | "custom";

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
  { value: "parceiro", label: "Pagamento de parceiro" },
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

const PARTNER_PAYMENT_TYPES = [
  { value: "salary", label: "Salário" },
  { value: "commission", label: "Comissão" },
  { value: "bonus", label: "Bônus" },
  { value: "advance", label: "Adiantamento" },
  { value: "other", label: "Outro" },
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

const getRange = (key: RangeKey, customStart?: Date, customEnd?: Date): { start: Date; end: Date; label: string } => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (key === "custom" && customStart) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd || customStart);
    e.setHours(23, 59, 59, 999);
    const sameDay = s.toDateString() === e.toDateString();
    const label = sameDay
      ? format(s, "dd/MM/yyyy", { locale: ptBR })
      : `${format(s, "dd/MM/yyyy", { locale: ptBR })} — ${format(e, "dd/MM/yyyy", { locale: ptBR })}`;
    return { start: s, end: e, label };
  }
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
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
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
  // Expenses
  const [cashExpenses, setCashExpenses] = useState<CashExpenseRow[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState<string>("expediente");
  const [expDescription, setExpDescription] = useState<string>("");
  const [expAmount, setExpAmount] = useState<string>("");
  const [expMethod, setExpMethod] = useState<string>("dinheiro");
  const [expDate, setExpDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [expNotes, setExpNotes] = useState<string>("");
  const [expPartnerId, setExpPartnerId] = useState<string>("");
  const [expPartnerType, setExpPartnerType] = useState<string>("salary");
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);
  // Master-only wipe
  const MASTER_ADMIN_ID = "4649913b-f48b-470e-b407-251803756157";
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeText, setWipeText] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeMsg, setWipeMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data?.user?.id ?? null));
  }, []);


  const { start, end, label } = useMemo(() => getRange(range, customStart, customEnd), [range, customStart, customEnd]);

  const loadData = async () => {
    setLoading(true);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const startYmd = toYmd(start);
    const endYmd = toYmd(end);
    const [payRes, ppRes, aptRes, spRes, profRes, partRes, expRes] = await Promise.all([
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
      (supabase as any)
        .from("cash_expenses")
        .select("id, category, description, amount_cents, payment_method, expense_date, notes, created_at")
        .gte("expense_date", startYmd)
        .lte("expense_date", endYmd)
        .order("expense_date", { ascending: false })
        .limit(1000),
    ]);
    setPayments((payRes.data || []) as PaymentRow[]);
    setPartnerPayments((ppRes.data || []) as PartnerPaymentRow[]);
    setAppointments((aptRes.data || []) as AppointmentRow[]);
    setServicePrices((spRes.data || []) as ServicePriceRow[]);
    setCashExpenses((expRes.data || []) as CashExpenseRow[]);
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
  }, [range, customStart, customEnd]);

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
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return 0;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const maskBRL = (raw: string): string => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    const n = parseInt(digits, 10);
    return (n / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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


  const resetExpense = () => {
    setExpenseOpen(false);
    setExpCategory("expediente");
    setExpDescription("");
    setExpAmount("");
    setExpMethod("dinheiro");
    setExpDate(format(new Date(), "yyyy-MM-dd"));
    setExpNotes("");
    setExpPartnerId("");
    setExpPartnerType("salary");
  };

  const handleSaveExpense = async () => {
    const amount = parseAmount(expAmount);
    if (amount <= 0) { return; }
    setSavingExpense(true);
    const { data: u } = await supabase.auth.getUser();

    if (expCategory === "parceiro") {
      if (!expPartnerId) { setSavingExpense(false); return; }
      const typeLabel = PARTNER_PAYMENT_TYPES.find(t => t.value === expPartnerType)?.label || expPartnerType;
      const partnerName = partners.get(expPartnerId) || "Parceiro";
      const desc = (expDescription.trim() || `${typeLabel} — ${partnerName}`).slice(0, 200);
      const refMonth = expDate.slice(0, 7); // YYYY-MM
      const paidAtIso = new Date(`${expDate}T${format(new Date(), "HH:mm:ss")}`).toISOString();
      const { error } = await supabase.from("partner_payments").insert({
        partner_id: expPartnerId,
        amount_cents: amount,
        type: expPartnerType,
        description: desc,
        reference_month: refMonth,
        paid_at: paidAtIso,
        created_by: u?.user?.id || null,
      });
      setSavingExpense(false);
      if (error) return;
      resetExpense();
      loadData();
      return;
    }

    if (!expDescription.trim()) { setSavingExpense(false); return; }
    const { error } = await (supabase as any).from("cash_expenses").insert({
      category: expCategory,
      description: expDescription.trim().slice(0, 200),
      amount_cents: amount,
      payment_method: expMethod,
      expense_date: expDate,
      notes: expNotes.trim().slice(0, 500) || null,
      created_by: u?.user?.id || null,
    });
    setSavingExpense(false);
    if (error) return;
    resetExpense();
    loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpense(id);
    const { error } = await (supabase as any).from("cash_expenses").delete().eq("id", id);
    setDeletingExpense(null);
    if (!error) loadData();
  };

  const handleWipeAll = async () => {
    if (wipeText.trim().toUpperCase() !== "LIMPAR") return;
    setWiping(true);
    setWipeMsg(null);
    const results = await Promise.all([
      supabase.from("payments").delete().not("id", "is", null),
      supabase.from("partner_payments").delete().not("id", "is", null),
      (supabase as any).from("cash_expenses").delete().not("id", "is", null),
    ]);
    const errs = results.map(r => r.error).filter(Boolean);
    setWiping(false);
    if (errs.length) {
      setWipeMsg(`Falha ao limpar: ${errs.map(e => e!.message).join(" | ")}`);
      return;
    }
    setWipeOpen(false);
    setWipeText("");
    setWipeMsg(null);
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

    const partnerExpenses = partnerPayments.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const operationalExpenses = cashExpenses.reduce((s, e) => s + (e.amount_cents || 0), 0);
    const expenses = partnerExpenses + operationalExpenses;
    const net = cashIn - expenses - refundedSum;
    const transactions = paidPayments.length;
    const avgTicket = transactions > 0 ? Math.round(cashIn / transactions) : 0;
    return {
      cashIn, pendingRecorded, virtualSum, receivables, refundedSum,
      expenses, partnerExpenses, operationalExpenses, net,
      transactions, avgTicket,
      paidCount: paidPayments.length, pendingCount: pendingPayments.length + virtualReceivables.length,

    };
  }, [payments, partnerPayments, virtualReceivables, cashExpenses]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <p className="font-body text-xs sm:text-sm text-muted-foreground truncate">
            Período: <span className="font-semibold text-foreground capitalize">{label}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted overflow-x-auto items-center">
          {ranges.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-body text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                range === r.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-body text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  range === "custom"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarIcon className="w-3 h-3" />
                {range === "custom" && customStart
                  ? (customEnd && customEnd.toDateString() !== customStart.toDateString()
                      ? `${format(customStart, "dd/MM")} – ${format(customEnd, "dd/MM")}`
                      : format(customStart, "dd/MM/yyyy"))
                  : "Escolher data"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="end">
              <Calendar
                mode="range"
                selected={{ from: customStart, to: customEnd }}
                onSelect={(rng) => {
                  setCustomStart(rng?.from);
                  setCustomEnd(rng?.to);
                  if (rng?.from) setRange("custom");
                  if (rng?.from && rng?.to) setDatePopoverOpen(false);
                }}
                numberOfMonths={1}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <button
            onClick={() => setExpenseOpen(true)}
            className="h-9 px-3 sm:px-4 rounded-xl bg-red-600 text-white font-body text-[11px] sm:text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <TrendingDown className="w-3.5 h-3.5" /> Nova despesa
          </button>
          <button
            onClick={() => setEntryOpen(true)}
            className="h-9 px-3 sm:px-4 rounded-xl bg-primary text-primary-foreground font-body text-[11px] sm:text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Wallet className="w-3.5 h-3.5" /> Nova entrada
          </button>
          {currentUserId === MASTER_ADMIN_ID && (
            <button
              onClick={() => { setWipeText(""); setWipeMsg(null); setWipeOpen(true); }}
              className="col-span-2 sm:col-span-1 h-9 px-3 sm:px-4 rounded-xl bg-destructive text-destructive-foreground font-body text-[11px] sm:text-xs font-bold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-destructive/30"
              title="Limpar todos os dados do caixa (somente Master Admin)"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Limpar caixa
            </button>
          )}
        </div>
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
            <KPICard icon={TrendingDown} label="Despesas" value={formatCents(totals.expenses)} trend={`${cashExpenses.length} expediente + ${partnerPayments.length} parceiros`} color="red" />
            <KPICard icon={Wallet} label="Saldo Líquido" value={formatCents(totals.net)} trend={`Ticket médio ${formatCents(totals.avgTicket)}`} color={totals.net >= 0 ? "primary" : "red"} />
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPICard icon={CalendarClock} label="Pendente em pagamentos" value={formatCents(totals.pendingRecorded)} trend="Lançados como pendentes" color="amber" />
            <KPICard icon={CheckCircle2} label="Serviços sem lançamento" value={formatCents(totals.virtualSum)} trend={`${virtualReceivables.length} agendamentos`} color="sky" />
            <KPICard icon={Zap} label="Despesas expediente" value={formatCents(totals.operationalExpenses)} trend={`${cashExpenses.length} lançamentos`} color="red" />
            <KPICard icon={Users} label="Pagto parceiros" value={formatCents(totals.partnerExpenses)} trend={`${partnerPayments.length} repasses`} color="slate" />
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
              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background font-body text-xs w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-primary"
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
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-body text-sm font-semibold text-foreground truncate">{c.name}</p>
                          <span className="font-heading text-sm font-bold text-foreground shrink-0 sm:hidden">{formatCents(c.realized + c.scheduled)}</span>
                        </div>
                        <div className="flex items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-body flex-wrap">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatCents(c.realized)} realizado</span>
                          {c.scheduled > 0 && <><span className="hidden sm:inline">•</span><span className="text-sky-600 dark:text-sky-400">{formatCents(c.scheduled)} agendado</span></>}
                          {balance > 0 && <><span className="hidden sm:inline">•</span><span className="text-amber-600 dark:text-amber-400 font-semibold">{formatCents(balance)} em aberto</span></>}
                        </div>
                      </div>
                      <span className="font-heading text-sm font-bold text-foreground shrink-0 hidden sm:inline">{formatCents(c.realized + c.scheduled)}</span>
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
                                      <div key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-body p-2 rounded-md bg-background/60">
                                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{a.appointment_date.split("-").reverse().join("/")} {a.appointment_time}</span>
                                        <span className="flex-1 min-w-[120px] truncate text-foreground">{a.service_title}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                                        <span className="font-semibold text-foreground text-right ml-auto sm:ml-0 sm:w-20">{formatCents(a.price_cents)}</span>
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
                                      <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-body p-2 rounded-md bg-background/60">
                                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{format(new Date(p.created_at), "dd/MM HH:mm")}</span>
                                        <Icon className="w-3 h-3 text-primary shrink-0" />
                                        <span className="flex-1 min-w-[80px] truncate text-foreground">{METHOD_LABEL[p.method] || p.method}</span>
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                                        <span className="font-semibold text-foreground text-right ml-auto sm:ml-0 sm:w-20">{formatCents(p.amount_cents || 0)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-between pt-2 border-t border-border text-xs font-body">
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

          {/* Despesas do Expediente */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-600" />
                <h3 className="font-heading text-sm font-bold text-foreground">Despesas do expediente ({cashExpenses.length})</h3>
                <span className="text-[11px] font-body text-muted-foreground">— Total: <span className="font-bold text-red-600">{formatCents(totals.operationalExpenses)}</span></span>
              </div>
              <button
                onClick={() => setExpenseOpen(true)}
                className="h-8 px-3 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 flex items-center gap-1.5"
              >
                <TrendingDown className="w-3 h-3" /> Adicionar despesa
              </button>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {cashExpenses.length === 0 ? (
                <p className="text-center py-8 font-body text-sm text-muted-foreground">Nenhuma despesa registrada no período.</p>
              ) : (
                cashExpenses.map(e => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category;
                  const Icon = METHOD_ICON[e.payment_method] || Receipt;
                  return (
                    <div key={e.id} className="px-3 sm:px-4 md:px-6 py-3 flex items-center gap-2 sm:gap-3 hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-sm font-semibold text-foreground truncate max-w-full">{e.description}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 capitalize">
                            {cat}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-body flex-wrap">
                          <Icon className="w-3 h-3" />
                          <span>{METHOD_LABEL[e.payment_method] || e.payment_method}</span>
                          <span>•</span>
                          <span>{e.expense_date.split("-").reverse().join("/")}</span>
                          {e.notes && <><span>•</span><span className="truncate max-w-[140px]">{e.notes}</span></>}
                        </div>
                      </div>
                      <span className="font-heading text-sm font-bold text-red-600 shrink-0">-{formatCents(e.amount_cents)}</span>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        disabled={deletingExpense === e.id}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors shrink-0"
                        title="Excluir despesa"
                      >
                        {deletingExpense === e.id ? (
                          <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Despesas com Parceiros — agrupado por parceiro */}
          {(() => {
            const grouped = new Map<string, { name: string; total: number; items: PartnerPaymentRow[] }>();
            partnerPayments.forEach(p => {
              const name = partners.get(p.partner_id) || "Parceiro";
              const cur = grouped.get(p.partner_id) || { name, total: 0, items: [] };
              cur.total += p.amount_cents || 0;
              cur.items.push(p);
              grouped.set(p.partner_id, cur);
            });
            const groups = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
            return (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 text-red-600" />
                    <h3 className="font-heading text-sm font-bold text-foreground">Despesas com parceiros ({groups.length} parceiros • {partnerPayments.length} pagamentos)</h3>
                    <span className="text-[11px] font-body text-muted-foreground">— Total: <span className="font-bold text-red-600">{formatCents(totals.partnerExpenses)}</span></span>
                  </div>
                </div>
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {groups.length === 0 ? (
                    <p className="text-center py-8 font-body text-sm text-muted-foreground">Nenhum pagamento a parceiros no período.</p>
                  ) : (
                    groups.map(g => (
                      <div key={g.name} className="px-3 sm:px-4 md:px-6 py-3 space-y-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-[11px] font-bold text-red-600 shrink-0">
                            {g.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-body text-sm font-bold text-foreground truncate">{g.name}</p>
                            <p className="font-body text-[11px] text-muted-foreground">{g.items.length} pagamento{g.items.length > 1 ? "s" : ""} no período</p>
                          </div>
                          <span className="font-heading text-sm font-bold text-red-600 shrink-0">-{formatCents(g.total)}</span>
                        </div>
                        <div className="pl-0 sm:pl-12 space-y-1">
                          {g.items
                            .slice()
                            .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
                            .map(p => {
                              const typeLabel = p.type === "salary" ? "Salário" : p.type === "commission" ? "Comissão" : p.type === "bonus" ? "Bônus" : p.type === "advance" ? "Adiantamento" : p.type;
                              return (
                                <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-body p-2 rounded-md bg-background/60">
                                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{format(new Date(p.paid_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 capitalize">{typeLabel}</span>
                                  <span className="flex-1 min-w-[120px] truncate text-foreground">{p.description || "—"}</span>
                                  <span className="font-bold text-red-600 ml-auto">-{formatCents(p.amount_cents)}</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}


          {/* Transactions list (raw inflows + outflows) */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">Movimentações de caixa ({payments.length + partnerPayments.length + cashExpenses.length})</h3>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {payments.length === 0 && partnerPayments.length === 0 && cashExpenses.length === 0 && (
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
                      onChange={(e) => setEntryAmount(maskBRL(e.target.value))}
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

      {/* Expense Modal */}
      <AnimatePresence>
        {expenseOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) resetExpense(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  {expCategory === "parceiro" ? "Nova despesa com parceiro" : "Nova despesa do expediente"}
                </h3>
                <button onClick={resetExpense} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Categoria *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {expCategory === "parceiro" && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="col-span-2">
                      <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Parceiro *</label>
                      <select
                        value={expPartnerId}
                        onChange={(e) => setExpPartnerId(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Selecione o parceiro…</option>
                        {Array.from(partners.entries()).sort((a, b) => a[1].localeCompare(b[1])).map(([pid, name]) => (
                          <option key={pid} value={pid}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Tipo do pagamento *</label>
                      <select
                        value={expPartnerType}
                        onChange={(e) => setExpPartnerType(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {PARTNER_PAYMENT_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
                    Descrição {expCategory === "parceiro" ? "(opcional)" : "*"}
                  </label>
                  <input
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value.slice(0, 200))}
                    placeholder={expCategory === "parceiro" ? "Ex.: Comissão referente à semana de 02/06" : "Ex.: Algodão, álcool, sacolinhas..."}
                    maxLength={200}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Valor (R$) *</label>
                    <input
                      value={expAmount}
                      onChange={(e) => setExpAmount(maskBRL(e.target.value))}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Data</label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                {expCategory !== "parceiro" && (
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Forma de pagamento</label>
                    <select
                      value={expMethod}
                      onChange={(e) => setExpMethod(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="credito">Crédito</option>
                      <option value="debito">Débito</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                )}
                {expCategory !== "parceiro" && (
                  <div>
                    <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">Observações (opcional)</label>
                    <input
                      value={expNotes}
                      onChange={(e) => setExpNotes(e.target.value.slice(0, 500))}
                      placeholder="Nota fiscal, fornecedor, etc."
                      maxLength={500}
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/30">
                <button onClick={resetExpense} className="h-9 px-4 rounded-md border border-border text-xs font-bold hover:bg-muted">Cancelar</button>
                <button
                  onClick={handleSaveExpense}
                  disabled={
                    parseAmount(expAmount) <= 0 ||
                    savingExpense ||
                    (expCategory === "parceiro" ? !expPartnerId : !expDescription.trim())
                  }
                  className="h-9 px-4 rounded-md bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingExpense ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  {expCategory === "parceiro" ? "Salvar pagamento" : "Salvar despesa"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wipe Cash Modal — Master Admin only */}
      <AnimatePresence>
        {wipeOpen && currentUserId === MASTER_ADMIN_ID && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !wiping) { setWipeOpen(false); setWipeText(""); setWipeMsg(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-destructive/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-heading text-base font-bold text-foreground">Limpar todos os dados do caixa</h3>
              </div>
              <div className="p-5 space-y-3">
                <p className="font-body text-sm text-foreground">
                  Esta ação <strong>apaga permanentemente</strong> todos os registros de:
                </p>
                <ul className="font-body text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  <li>Pagamentos de clientes ({payments.length} no período visível)</li>
                  <li>Repasses a parceiros ({partnerPayments.length} no período visível)</li>
                  <li>Despesas do expediente ({cashExpenses.length} no período visível)</li>
                </ul>
                <p className="font-body text-xs text-destructive font-semibold">
                  ⚠️ Os dados serão removidos do banco e não poderão ser recuperados.
                </p>
                <div>
                  <label className="font-body text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1 block">
                    Digite <span className="text-destructive font-bold">LIMPAR</span> para confirmar
                  </label>
                  <input
                    value={wipeText}
                    onChange={(e) => setWipeText(e.target.value)}
                    placeholder="LIMPAR"
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
                    autoFocus
                  />
                </div>
                {wipeMsg && <p className="font-body text-xs text-destructive">{wipeMsg}</p>}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/30">
                <button
                  onClick={() => { setWipeOpen(false); setWipeText(""); setWipeMsg(null); }}
                  disabled={wiping}
                  className="h-9 px-4 rounded-md border border-border text-xs font-bold hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWipeAll}
                  disabled={wipeText.trim().toUpperCase() !== "LIMPAR" || wiping}
                  className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {wiping ? <div className="w-3 h-3 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Limpar tudo
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
