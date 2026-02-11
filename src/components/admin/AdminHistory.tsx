import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, User, Phone, Calendar, Clock, Hash, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
}

interface CompletedPlan {
  id: string;
  user_id: string;
  service_slug: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CompletedAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service_title: string;
  session_number: number | null;
  plan_id: string | null;
}

interface ClientGroup {
  userId: string;
  profile: Profile | null;
  plans: CompletedPlan[];
  appointments: CompletedAppointment[];
}

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const AdminHistory = () => {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch completed plans
      const { data: plans } = await supabase
        .from("client_plans")
        .select("id, user_id, service_slug, service_title, plan_name, total_sessions, completed_sessions, status, created_at, updated_at")
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (!plans || plans.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Fetch completed/cancelled appointments for these plans
      const planIds = plans.map((p) => p.id);
      const userIds = [...new Set(plans.map((p) => p.user_id))];

      const [appointmentsRes, profilesRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, service_title, session_number, plan_id")
          .in("plan_id", planIds)
          .in("status", ["confirmed", "cancelled"])
          .order("appointment_date", { ascending: true }),
        supabase
          .from("profiles")
          .select("user_id, full_name, phone, email, avatar_url")
          .in("user_id", userIds),
      ]);

      const profileMap: Record<string, Profile> = {};
      profilesRes.data?.forEach((p: any) => {
        profileMap[p.user_id] = p;
      });

      // Group by user
      const groupMap: Record<string, ClientGroup> = {};
      for (const plan of plans) {
        if (!groupMap[plan.user_id]) {
          groupMap[plan.user_id] = {
            userId: plan.user_id,
            profile: profileMap[plan.user_id] || null,
            plans: [],
            appointments: [],
          };
        }
        groupMap[plan.user_id].plans.push(plan as CompletedPlan);
      }

      // Add appointments to groups
      appointmentsRes.data?.forEach((apt: any) => {
        const plan = plans.find((p) => p.id === apt.plan_id);
        if (plan && groupMap[plan.user_id]) {
          groupMap[plan.user_id].appointments.push(apt);
        }
      });

      setGroups(Object.values(groupMap));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-body text-muted-foreground">Nenhum procedimento finalizado ainda.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h2 className="font-heading text-lg font-bold text-foreground mb-4">
        Procedimentos Finalizados ({groups.length} {groups.length === 1 ? "cliente" : "clientes"})
      </h2>

      {groups.map((group) => {
        const isExpanded = expandedClient === group.userId;
        const profile = group.profile;

        return (
          <motion.div
            key={group.userId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border overflow-hidden"
          >
            {/* Client header */}
            <button
              onClick={() => setExpandedClient(isExpanded ? null : group.userId)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : profile ? (
                  <span className="font-heading text-sm font-bold text-primary">{getInitials(profile.full_name)}</span>
                ) : (
                  <User className="w-5 h-5 text-primary/50" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-heading text-sm font-semibold text-foreground truncate">
                  {profile?.full_name || "Cliente não identificado"}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {group.plans.length} {group.plans.length === 1 ? "plano concluído" : "planos concluídos"}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="border-t border-border"
              >
                <div className="p-5 space-y-4">
                  {group.plans.map((plan) => {
                    const planApts = group.appointments
                      .filter((a) => a.plan_id === plan.id)
                      .sort((a, b) => (a.session_number || 0) - (b.session_number || 0));

                    return (
                      <div key={plan.id} className="rounded-xl border border-border p-4 space-y-3">
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

                        {/* Session history */}
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
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default AdminHistory;
