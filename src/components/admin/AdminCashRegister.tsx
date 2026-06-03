import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Clock, CreditCard, Banknote, QrCode, Receipt, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Users, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/hooks/useServicePrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RangeKey = "day" | "15d" | "month" | "30d";

interface PaymentRow {
  id: string;
  user_id: string;
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

interface ProfileLite {
  user_id: string;
  full_name: string;
}

interface PartnerLite {
  id: string;
  full_name: string;
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
  // month current
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: format(now, "MMMM yyyy", { locale: ptBR }) };
};

const KPICard = ({ icon: Icon, label, value, trend, color = "primary" }: { icon: any; label: string; value: string; trend?: string; color?: "primary" | "emerald" | "amber" | "red" | "slate" }) => {
  const colorMap: Record<string, string> = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20",
    red: "from-red-500/10 to-red-500/5 text-red-600 dark:text-red-400 border-red-500/20",
    slate: "from-slate-500/10 to-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/20",
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
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [partners, setPartners] = useState<Map<string, string>>(new Map());

  const { start, end, label } = useMemo(() => getRange(range), [range]);

  const loadData = async () => {
    setLoading(true);
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const [payRes, ppRes, profRes, partRes] = await Promise.all([
      supabase
        .from("payments")
        .select("id, user_id, method, amount_cents, status, created_at, metadata")
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
      supabase.from("profiles").select("user_id, full_name"),
      supabase.from("partners").select("id, full_name"),
    ]);
    setPayments((payRes.data || []) as PaymentRow[]);
    setPartnerPayments((ppRes.data || []) as PartnerPaymentRow[]);
    const pm = new Map<string, string>();
    (profRes.data || []).forEach((p: ProfileLite) => pm.set(p.user_id, p.full_name));
    setProfiles(pm);
    const ptm = new Map<string, string>();
    (partRes.data || []).forEach((p: PartnerLite) => ptm.set(p.id, p.full_name));
    setPartners(ptm);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // KPIs
  const totals = useMemo(() => {
    const paid = payments.filter(p => p.status === "paid");
    const pending = payments.filter(p => p.status === "pending");
    const refunded = payments.filter(p => p.status === "refunded");
    const sum = (arr: PaymentRow[]) => arr.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const paidSum = sum(paid);
    const pendingSum = sum(pending);
    const refundedSum = sum(refunded);
    const expenses = partnerPayments.reduce((s, p) => s + (p.amount_cents || 0), 0);
    const net = paidSum - expenses - refundedSum;
    const transactions = paid.length;
    const avgTicket = transactions > 0 ? Math.round(paidSum / transactions) : 0;
    return { paidSum, pendingSum, refundedSum, expenses, net, transactions, avgTicket };
  }, [payments, partnerPayments]);

  // Group by method
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

  // Daily series
  const byDay = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number }>();
    payments.forEach(p => {
      const d = format(new Date(p.created_at), "dd/MM");
      const cur = map.get(d) || { paid: 0, pending: 0 };
      if (p.status === "paid") cur.paid += p.amount_cents || 0;
      if (p.status === "pending") cur.pending += p.amount_cents || 0;
      map.set(d, cur);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const [da, ma] = a[0].split("/").map(Number);
      const [db, mb] = b[0].split("/").map(Number);
      return ma === mb ? da - db : ma - mb;
    });
  }, [payments]);

  const maxDaily = useMemo(() => Math.max(1, ...byDay.map(([, v]) => v.paid + v.pending)), [byDay]);

  // Top clients
  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    payments.filter(p => p.status === "paid").forEach(p => {
      map.set(p.user_id, (map.get(p.user_id) || 0) + (p.amount_cents || 0));
    });
    return Array.from(map.entries())
      .map(([userId, total]) => ({ userId, name: profiles.get(userId) || "Cliente", total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [payments, profiles]);

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
            <KPICard icon={TrendingUp} label="Receita (Pago)" value={formatCents(totals.paidSum)} trend={`${totals.transactions} transações`} color="emerald" />
            <KPICard icon={Clock} label="A Receber" value={formatCents(totals.pendingSum)} trend={`${payments.filter(p => p.status === "pending").length} pendentes`} color="amber" />
            <KPICard icon={TrendingDown} label="Despesas" value={formatCents(totals.expenses)} trend={`${partnerPayments.length} pagamentos`} color="red" />
            <KPICard icon={Wallet} label="Saldo Líquido" value={formatCents(totals.net)} trend={`Ticket médio ${formatCents(totals.avgTicket)}`} color={totals.net >= 0 ? "primary" : "red"} />
          </motion.div>

          {/* Daily Chart */}
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Fluxo Diário</h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-body">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Pago</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pendente</span>
              </div>
            </div>
            {byDay.length === 0 ? (
              <p className="text-center py-10 font-body text-sm text-muted-foreground">Sem movimentações no período.</p>
            ) : (
              <div className="space-y-1.5">
                {byDay.map(([day, v]) => {
                  const paidPct = (v.paid / maxDaily) * 100;
                  const pendingPct = (v.pending / maxDaily) * 100;
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground w-10 shrink-0">{day}</span>
                      <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} title={`Pago: ${formatCents(v.paid)}`} />
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${pendingPct}%` }} title={`Pendente: ${formatCents(v.pending)}`} />
                      </div>
                      <span className="font-body text-[11px] text-foreground font-semibold w-20 text-right shrink-0">{formatCents(v.paid + v.pending)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two columns: By Method + Top Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Method */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Por forma de pagamento</h3>
              </div>
              {byMethod.length === 0 ? (
                <p className="text-center py-6 font-body text-sm text-muted-foreground">Sem pagamentos confirmados.</p>
              ) : (
                <div className="space-y-2">
                  {byMethod.map(([method, v]) => {
                    const Icon = METHOD_ICON[method] || Receipt;
                    const pct = totals.paidSum > 0 ? (v.total / totals.paidSum) * 100 : 0;
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

            {/* Top Clients */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Top clientes do período</h3>
              </div>
              {topClients.length === 0 ? (
                <p className="text-center py-6 font-body text-sm text-muted-foreground">Sem clientes com pagamentos.</p>
              ) : (
                <div className="space-y-2">
                  {topClients.map((c, i) => (
                    <div key={c.userId} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {i + 1}
                        </div>
                        <span className="font-body text-sm text-foreground truncate">{c.name}</span>
                      </div>
                      <span className="font-body text-sm font-bold text-foreground shrink-0">{formatCents(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transactions list */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-sm font-bold text-foreground">Movimentações ({payments.length + partnerPayments.length})</h3>
              </div>
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
    </div>
  );
};

export default AdminCashRegister;
