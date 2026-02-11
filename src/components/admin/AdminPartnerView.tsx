import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Bell, CalendarCheck, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Appointment {
  id: string;
  service_title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  user_id: string;
  partner_id: string | null;
  plan_id: string | null;
  session_number: number | null;
  total_sessions?: number | null;
  profile?: {
    full_name: string;
    phone: string;
    avatar_url: string | null;
  } | null;
  partner_name?: string;
}

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const AdminPartnerView = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [partners, setPartners] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [{ data: apts }, { data: partnersList }] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, service_title, appointment_date, appointment_time, status, user_id, partner_id, plan_id, session_number")
          .gte("appointment_date", today)
          .in("status", ["confirmed", "pending"])
          .not("partner_id", "is", null)
          .order("appointment_date")
          .order("appointment_time"),
        supabase.from("partners").select("id, full_name").eq("is_active", true).order("full_name"),
      ]);

      setPartners(partnersList || []);

      if (apts && apts.length > 0) {
        const userIds = [...new Set(apts.map((a) => a.user_id))];
        const planIds = [...new Set(apts.filter((a) => a.plan_id).map((a) => a.plan_id!))];

        const [{ data: profiles }, planResult] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone, avatar_url").in("user_id", userIds),
          planIds.length > 0
            ? supabase.from("client_plans").select("id, total_sessions, completed_sessions").in("id", planIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const profileMap: Record<string, any> = {};
        profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

        const partnerMap: Record<string, string> = {};
        partnersList?.forEach((p) => { partnerMap[p.id] = p.full_name; });

        const planMap: Record<string, any> = {};
        planResult?.data?.forEach((p: any) => { planMap[p.id] = p; });

        setAppointments(
          apts.map((a) => ({
            ...a,
            profile: profileMap[a.user_id] || null,
            partner_name: a.partner_id ? partnerMap[a.partner_id] || "—" : "—",
            total_sessions: a.plan_id ? planMap[a.plan_id]?.total_sessions || null : null,
          }))
        );
      }

      setLoading(false);
    };

    fetch();
  }, []);

  const filtered = selectedPartner === "all"
    ? appointments
    : appointments.filter((a) => a.partner_id === selectedPartner);

  const grouped = filtered.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];
  const todayCount = filtered.filter((a) => a.appointment_date === today).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="font-body text-sm text-muted-foreground">Filtrar por parceiro:</label>
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="h-9 rounded-xl border border-border bg-card px-3 font-body text-sm text-foreground"
        >
          <option value="all">Todos os parceiros</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <CalendarCheck className="w-5 h-5 text-primary mb-2" />
          <p className="font-heading text-2xl font-bold text-foreground">{todayCount}</p>
          <p className="font-body text-xs text-muted-foreground">Hoje</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <Calendar className="w-5 h-5 text-primary mb-2" />
          <p className="font-heading text-2xl font-bold text-foreground">{filtered.length}</p>
          <p className="font-body text-xs text-muted-foreground">Total Próximos</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <Bell className="w-5 h-5 text-primary mb-2" />
          <p className="font-heading text-2xl font-bold text-foreground">{partners.length}</p>
          <p className="font-body text-xs text-muted-foreground">Parceiros Ativos</p>
        </div>
      </div>

      {/* Schedule */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum agendamento atribuído a parceiros.</p>
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
                        {apt.profile?.full_name || "Cliente"} · <span className="text-primary font-semibold">{apt.partner_name}</span>
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
                        {apt.session_number && apt.total_sessions && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                            Sessão {apt.session_number}/{apt.total_sessions}
                          </span>
                        )}
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
    </div>
  );
};

export default AdminPartnerView;
