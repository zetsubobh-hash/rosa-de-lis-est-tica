import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarCheck, CreditCard, Package, Clock, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCents } from "@/hooks/useServicePrices";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  session_number: number | null;
  plan_id: string | null;
  partner_name?: string;
}

interface Payment {
  id: string;
  method: string;
  amount_cents: number | null;
  status: string;
  created_at: string;
  metadata: any;
}

interface Plan {
  id: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
  created_at: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  confirmed: { label: "Confirmado", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  completed: { label: "Concluído", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelado", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  pending: { label: "Pendente", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  paid: { label: "Pago", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  active: { label: "Ativo", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  finished: { label: "Finalizado", class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const METHOD_MAP: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  outro: "Outro",
  mercadopago: "Mercado Pago",
};

const getStatus = (status: string) => STATUS_MAP[status] || { label: status, class: "bg-muted text-muted-foreground" };

const UserHistoryModal = ({ open, onClose, userId, userName }: Props) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState<"appointments" | "payments" | "plans">("appointments");

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetchAll = async () => {
      const [apptRes, payRes, planRes, partnersRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, service_title, service_slug, appointment_date, appointment_time, status, notes, session_number, plan_id, partner_id")
          .eq("user_id", userId)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false }),
        supabase
          .from("payments")
          .select("id, method, amount_cents, status, created_at, metadata")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("client_plans")
          .select("id, service_title, plan_name, total_sessions, completed_sessions, status, created_at, notes")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("partners").select("id, full_name"),
      ]);

      const partnerMap = new Map<string, string>();
      partnersRes.data?.forEach((p: any) => partnerMap.set(p.id, p.full_name));

      setAppointments(
        (apptRes.data || []).map((a: any) => ({
          ...a,
          partner_name: a.partner_id ? partnerMap.get(a.partner_id) || "—" : undefined,
        }))
      );
      setPayments((payRes.data || []) as Payment[]);
      setPlans((planRes.data || []) as Plan[]);
      setLoading(false);
    };

    fetchAll();
  }, [open, userId]);

  if (!open) return null;

  const tabs = [
    { key: "appointments" as const, label: "Procedimentos", icon: CalendarCheck, count: appointments.length },
    { key: "payments" as const, label: "Pagamentos", icon: CreditCard, count: payments.length },
    { key: "plans" as const, label: "Planos", icon: Package, count: plans.length },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Histórico do Cliente</h2>
              <p className="font-body text-sm text-muted-foreground">{userName}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 pb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-body font-medium transition-all ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tab === t.key ? "bg-primary-foreground/20" : "bg-muted"
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Appointments */}
                {tab === "appointments" && (
                  <div className="space-y-2 mt-2">
                    {appointments.length === 0 ? (
                      <p className="font-body text-sm text-muted-foreground text-center py-8">Nenhum procedimento registrado.</p>
                    ) : (
                      appointments.map((a) => (
                        <div key={a.id} className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-body text-sm font-semibold text-foreground">{a.service_title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatus(a.status).class}`}>
                              {getStatus(a.status).label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs font-body text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarCheck className="w-3 h-3" />
                              {format(new Date(a.appointment_date + "T12:00:00"), "dd/MM/yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {a.appointment_time}
                            </span>
                            {a.session_number && (
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Sessão {a.session_number}
                              </span>
                            )}
                            {a.partner_name && (
                              <span className="text-primary/70">Prof: {a.partner_name}</span>
                            )}
                          </div>
                          {a.notes && (
                            <p className="font-body text-xs text-muted-foreground/80 flex items-start gap-1">
                              <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                              {a.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Payments */}
                {tab === "payments" && (
                  <div className="space-y-2 mt-2">
                    {payments.length === 0 ? (
                      <p className="font-body text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado.</p>
                    ) : (
                      payments.map((p) => {
                        const items = p.metadata?.items as any[] | undefined;
                        return (
                          <div key={p.id} className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-body text-sm font-semibold text-foreground">
                                {METHOD_MAP[p.method] || p.method}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatus(p.status).class}`}>
                                  {getStatus(p.status).label}
                                </span>
                                <span className="font-body text-sm font-bold text-primary">
                                  {p.amount_cents ? formatCents(p.amount_cents) : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs font-body text-muted-foreground">
                              {format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {p.metadata?.source === "counter_sale" && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">Venda Balcão</span>
                              )}
                            </div>
                            {items && items.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-xs font-body text-muted-foreground">
                                    <span>
                                      {item.serviceTitle}
                                      {item.planName && ` (${item.planName})`}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium">{formatCents(item.priceCents)}</span>
                                      {item.customPrice && item.originalPriceCents && (
                                        <span className="line-through text-muted-foreground/50">{formatCents(item.originalPriceCents)}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Plans */}
                {tab === "plans" && (
                  <div className="space-y-2 mt-2">
                    {plans.length === 0 ? (
                      <p className="font-body text-sm text-muted-foreground text-center py-8">Nenhum plano registrado.</p>
                    ) : (
                      plans.map((pl) => (
                        <div key={pl.id} className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-body text-sm font-semibold text-foreground">{pl.service_title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatus(pl.status).class}`}>
                              {getStatus(pl.status).label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-xs font-body text-muted-foreground">
                            <span>{pl.plan_name}</span>
                            <span className="font-medium text-foreground">{pl.completed_sessions}/{pl.total_sessions} sessões</span>
                            <span>{format(new Date(pl.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(pl.completed_sessions / pl.total_sessions) * 100}%` }}
                            />
                          </div>
                          {pl.notes && (
                            <p className="font-body text-xs text-muted-foreground/80 flex items-start gap-1">
                              <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                              {pl.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserHistoryModal;
