import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck, ArrowLeft, Clock, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getIconByName } from "@/lib/iconMap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

interface Appointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
}

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const fetchAppointments = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at")
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false });

      setAppointments(data || []);
      setLoading(false);
    };

    fetchAppointments();
  }, [user, authLoading]);

  if (loading || authLoading) {
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
        {appointments.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            {appointments.map((apt, idx) => {
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
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="font-body text-xs text-muted-foreground">
                        {apt.appointment_date} • {apt.appointment_time}
                      </p>
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
        )}

        <Link to="/" className="flex items-center justify-center gap-1 mt-8 font-body text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default MeusAgendamentos;
