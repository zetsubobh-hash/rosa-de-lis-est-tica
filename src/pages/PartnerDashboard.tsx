import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Bell, LogOut, Home, CalendarCheck, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-branca.png";

interface Appointment {
  id: string;
  service_title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  user_id: string;
  profile?: {
    full_name: string;
    phone: string;
    avatar_url: string | null;
  } | null;
}

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const PartnerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNotifications, setNewNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const init = async () => {
      // Check if user is a partner
      const { data: partner } = await supabase
        .from("partners")
        .select("id, full_name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!partner) {
        navigate("/", { replace: true });
        return;
      }

      setPartnerId(partner.id);
      setPartnerName(partner.full_name);

      // Fetch assigned appointments
      const today = new Date().toISOString().split("T")[0];
      const { data: apts } = await supabase
        .from("appointments")
        .select("id, service_title, appointment_date, appointment_time, status, user_id")
        .eq("partner_id", partner.id)
        .gte("appointment_date", today)
        .in("status", ["confirmed", "pending"])
        .order("appointment_date")
        .order("appointment_time");

      if (apts && apts.length > 0) {
        const userIds = [...new Set(apts.map((a) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, avatar_url")
          .in("user_id", userIds);

        const profileMap: Record<string, any> = {};
        profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

        setAppointments(apts.map((a) => ({ ...a, profile: profileMap[a.user_id] || null })));
      }

      setLoading(false);
    };

    init();
  }, [user, navigate]);

  // Real-time subscription for new assignments
  useEffect(() => {
    if (!partnerId) return;

    const channel = supabase
      .channel("partner-appointments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `partner_id=eq.${partnerId}`,
        },
        async (payload) => {
          const apt = payload.new as any;
          // Fetch profile for the new appointment
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone, avatar_url")
            .eq("user_id", apt.user_id)
            .maybeSingle();

          setAppointments((prev) => {
            const exists = prev.find((a) => a.id === apt.id);
            const updated: Appointment = { ...apt, profile: profile || null };
            if (exists) {
              return prev.map((a) => a.id === apt.id ? updated : a);
            }
            return [...prev, updated].sort((a, b) =>
              `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`)
            );
          });

          setNewNotifications((prev) => [...prev, `Novo agendamento: ${apt.service_title} em ${formatDate(apt.appointment_date)} às ${apt.appointment_time}`]);

          // Auto-dismiss notification after 8s
          setTimeout(() => {
            setNewNotifications((prev) => prev.slice(1));
          }, 8000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerId]);

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.appointment_date === today).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-[hsl(var(--pink-dark))] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Rosa de Lis" className="h-10 w-auto" />
            <div>
              <p className="font-body text-xs text-primary-foreground/60 uppercase tracking-widest font-semibold">Painel do Parceiro</p>
              <p className="font-heading text-sm font-bold text-primary-foreground">{partnerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        <AnimatePresence>
          {newNotifications.map((msg, i) => (
            <motion.div
              key={`${i}-${msg}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm"
            >
              <Bell className="w-4 h-4 shrink-0" />
              <p className="font-body text-sm">{msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <CalendarCheck className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{todayCount}</p>
            <p className="font-body text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <Calendar className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{appointments.length}</p>
            <p className="font-body text-xs text-muted-foreground">Total Próximos</p>
          </div>
        </div>

        {/* Schedule */}
        {appointments.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-body text-muted-foreground">Nenhum agendamento atribuído a você.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, apts]) => (
            <div key={date}>
              <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                {formatDate(date)}
                {date === today && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">Hoje</span>
                )}
              </h3>
              <div className="space-y-3">
                {apts.map((apt) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {apt.profile?.avatar_url ? (
                          <img src={apt.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-heading text-xs font-bold text-primary">
                            {apt.profile ? getInitials(apt.profile.full_name) : "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-bold text-foreground">{apt.service_title}</p>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">
                          {apt.profile?.full_name || "Cliente"}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {apt.appointment_time}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            apt.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"
                          }`}>
                            {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                          </span>
                        </div>
                      </div>
                      {apt.profile?.phone && (
                        <div className="flex gap-1 shrink-0">
                          <a
                            href={`tel:${apt.profile.phone.replace(/\D/g, "")}`}
                            className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/55${apt.profile.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default PartnerDashboard;
