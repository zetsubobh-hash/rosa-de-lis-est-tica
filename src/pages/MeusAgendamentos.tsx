import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, ArrowLeft, Clock, XCircle, CheckCircle2, AlertCircle, Layers, ChevronDown, Calendar, Hash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getIconByName } from "@/lib/iconMap";
import { useClientPlans } from "@/hooks/useClientPlans";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import SessionScheduleModal from "@/components/SessionScheduleModal";

interface Appointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
  notes: string | null;
  plan_id: string | null;
  session_number: number | null;
}

const isRescheduled = (apt: Appointment): boolean => {
  if (!apt.notes) return false;
  try {
    const noteData = JSON.parse(apt.notes);
    return !!noteData.rescheduled;
  } catch { return false; }
};

const formatDateBR = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirmed: { label: "Confirmado", icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  pending: { label: "Pendente", icon: AlertCircle, className: "bg-gold/10 text-gold" },
  cancelled: { label: "Cancelado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const MeusAgendamentos = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{ planId: string; sessionNumber: number; serviceSlug: string; serviceTitle: string } | null>(null);
  const { plans, loading: plansLoading, refetch: refetchPlans } = useClientPlans(user?.id);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const fetchAppointments = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, notes, plan_id, session_number")
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      setAppointments(data || []);
      setLoading(false);
    };

    fetchAppointments();
  }, [user, authLoading]);

  const refetchAll = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, notes, plan_id, session_number")
      .eq("user_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false });
    setAppointments(data || []);
    refetchPlans();
  };

  if (loading || authLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <CalendarCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-1">Minha conta</p>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">Meus Agendamentos</h1>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Active Plans / Session Progress */}
        {plans.filter((p) => p.status === "active").length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg font-bold text-foreground">Meus Planos</h2>
            </div>
            <div className="space-y-3">
              {plans
                .filter((p) => p.status === "active" || p.status === "completed")
                .map((plan, idx) => {
                  const Icon = getIconByName("Sparkles");
                  const progress = plan.total_sessions > 0 ? (plan.completed_sessions / plan.total_sessions) * 100 : 0;
                  const isComplete = plan.completed_sessions >= plan.total_sessions;
                  const isExpanded = expandedPlan === plan.id;
                  // Filter appointments related to this plan's service
                  const relatedAppointments = appointments.filter(
                    (a) => a.service_slug === plan.service_slug && a.status === "confirmed"
                  );

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      {/* Clickable header */}
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {Icon && (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading text-sm font-bold text-foreground truncate">{plan.service_title}</h4>
                            <p className="font-body text-xs text-muted-foreground">{plan.plan_name}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                            isComplete ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold"
                          }`}>
                            {isComplete ? (
                              <><CheckCircle2 className="w-3 h-3" /> Completo</>
                            ) : (
                              <>{plan.completed_sessions}/{plan.total_sessions} sessões</>
                            )}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="font-body text-[11px] text-muted-foreground mt-2">
                          {plan.completed_sessions} de {plan.total_sessions} sessões realizadas
                        </p>
                      </button>

                      {/* Expandable details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
                              {/* Session visual tracker */}
                              <div>
                                <p className="font-body text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                  <Hash className="w-3.5 h-3.5 text-primary" />
                                  Progresso das sessões
                                </p>
                                <div className="flex gap-1.5 flex-wrap">
                                  {Array.from({ length: plan.total_sessions }).map((_, i) => {
                                    const sessionNum = i + 1;
                                    const isCompleted = i < plan.completed_sessions;
                                    const isNext = sessionNum === plan.completed_sessions + 1 && !isComplete;
                                    const scheduledApt = appointments.find(
                                      (a) => a.plan_id === plan.id && a.session_number === sessionNum && a.status !== "cancelled"
                                    );
                                    const canSchedule = isNext && !scheduledApt;

                                    return (
                                      <button
                                        key={i}
                                        disabled={!canSchedule}
                                        onClick={() => {
                                          if (canSchedule) {
                                            setScheduleModal({
                                              planId: plan.id,
                                              sessionNumber: sessionNum,
                                              serviceSlug: plan.service_slug,
                                              serviceTitle: plan.service_title,
                                            });
                                          }
                                        }}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                                          isCompleted
                                            ? "bg-primary text-primary-foreground"
                                            : scheduledApt
                                            ? "bg-primary/30 text-primary ring-2 ring-primary/40"
                                            : canSchedule
                                            ? "bg-muted text-muted-foreground ring-2 ring-primary/50 cursor-pointer hover:bg-primary/10 hover:text-primary"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                        title={
                                          isCompleted ? `Sessão ${sessionNum} realizada` :
                                          scheduledApt ? `Sessão ${sessionNum} agendada - ${formatDateBR(scheduledApt.appointment_date)}` :
                                          canSchedule ? `Agendar sessão ${sessionNum}` :
                                          `Sessão ${sessionNum}`
                                        }
                                      >
                                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : sessionNum}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Related appointments */}
                              {relatedAppointments.length > 0 && (
                                <div>
                                  <p className="font-body text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-primary" />
                                    Agendamentos deste serviço
                                  </p>
                                  <div className="space-y-1.5">
                                    {relatedAppointments.map((a) => (
                                      <div key={a.id} className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/50">
                                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <p className="font-body text-xs text-muted-foreground">
                                          {formatDateBR(a.appointment_date)} • {a.appointment_time}
                                        </p>
                                        {isRescheduled(a) && (
                                          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider">
                                            Remarcado
                                          </span>
                                        )}
                                        <CheckCircle2 className="w-3 h-3 text-primary ml-auto shrink-0" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Plan info */}
                              <div className="flex items-center gap-4 text-[11px] font-body text-muted-foreground">
                                <span>Criado em {new Date(plan.created_at).toLocaleDateString("pt-BR")}</span>
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider font-semibold">
                                  {plan.created_by === "auto" ? "Automático" : "Manual"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        )}
        {(() => {
          const activePlanSlugs = plans
            .filter((p) => p.status === "active" || p.status === "completed")
            .map((p) => p.service_slug);
          const filteredAppointments = appointments.filter(
            (a) => !activePlanSlugs.includes(a.service_slug)
          );

          if (filteredAppointments.length === 0 && activePlanSlugs.length > 0) {
            return null;
          }

          if (filteredAppointments.length === 0) {
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-12 bg-card rounded-3xl border border-border">
                <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-heading text-lg font-bold text-foreground mb-2">Nenhum agendamento</h2>
                <p className="font-body text-sm text-muted-foreground mb-6">Você ainda não realizou nenhum agendamento.</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all uppercase tracking-wider"
                >
                  Ver serviços
                </Link>
              </motion.div>
            );
          }

          return (
            <div className="space-y-3">
              {filteredAppointments.map((apt, idx) => {
                const Icon = getIconByName("Sparkles");
                const status = statusConfig[apt.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4"
                  >
                    {Icon && (
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading text-sm font-bold text-foreground truncate">{apt.service_title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="font-body text-xs text-muted-foreground">
                          {formatDateBR(apt.appointment_date)} • {apt.appointment_time}
                        </p>
                        {isRescheduled(apt) && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-wider">
                            Remarcado
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${status.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

        <Link to="/" className="flex items-center justify-center gap-1 mt-8 font-body text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>

      <Footer />
      <WhatsAppButton />

      {/* Session Schedule Modal */}
      {user && scheduleModal && (
        <SessionScheduleModal
          open={!!scheduleModal}
          onClose={() => setScheduleModal(null)}
          onScheduled={refetchAll}
          planId={scheduleModal.planId}
          sessionNumber={scheduleModal.sessionNumber}
          serviceSlug={scheduleModal.serviceSlug}
          serviceTitle={scheduleModal.serviceTitle}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default MeusAgendamentos;
