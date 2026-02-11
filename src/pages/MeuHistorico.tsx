import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Clock, Hash, ArrowLeft, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CompletedPlan {
  id: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  updated_at: string;
}

interface HistoryAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  session_number: number | null;
  plan_id: string | null;
}

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const MeuHistorico = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CompletedPlan[]>([]);
  const [appointments, setAppointments] = useState<HistoryAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setLoading(true);
      const [plansRes, aptsRes] = await Promise.all([
        supabase
          .from("client_plans")
          .select("id, service_title, plan_name, total_sessions, completed_sessions, updated_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("updated_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, session_number, plan_id")
          .eq("user_id", user.id)
          .in("status", ["confirmed", "cancelled"])
          .order("appointment_date", { ascending: true }),
      ]);
      setPlans(plansRes.data || []);
      setAppointments(aptsRes.data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-28 pb-16 px-4 bg-background flex items-center justify-center">
          <p className="font-body text-muted-foreground">Faça login para ver seu histórico.</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-16 px-4 bg-background">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground">Meu Histórico</h1>
              <p className="font-body text-sm text-muted-foreground">Procedimentos finalizados</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-body text-muted-foreground">Nenhum procedimento finalizado ainda.</p>
              <p className="font-body text-xs text-muted-foreground mt-1">Seus planos concluídos aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan, i) => {
                const planApts = appointments
                  .filter((a) => a.plan_id === plan.id)
                  .sort((a, b) => (a.session_number || 0) - (b.session_number || 0));

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-2xl border border-border p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading text-sm font-bold text-foreground">{plan.service_title}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {plan.plan_name} • {plan.total_sessions} sessões
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </span>
                    </div>

                    {planApts.length > 0 && (
                      <div className="space-y-1.5">
                        {planApts.map((apt) => (
                          <div key={apt.id} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/50">
                            <Hash className="w-3 h-3 text-primary shrink-0" />
                            <span className="font-heading text-[11px] font-bold text-foreground w-5">
                              {apt.session_number || "—"}
                            </span>
                            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-body text-[11px] text-muted-foreground">
                              {formatDate(apt.appointment_date)}
                            </span>
                            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-body text-[11px] text-muted-foreground">
                              {apt.appointment_time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="font-body text-[10px] text-muted-foreground">
                      Finalizado em {format(new Date(plan.updated_at), "dd/MM/yyyy")}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MeuHistorico;
