import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, User, Calendar, Clock, Hash, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
}

interface CompletedAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service_title: string;
  session_number: number | null;
  plan_id: string | null;
  status: string;
}

interface ClientGroup {
  userId: string;
  profile: Profile | null;
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

      // Fetch ALL completed appointments (not just plan-linked)
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, user_id, appointment_date, appointment_time, service_title, session_number, plan_id, status")
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      if (!appointments || appointments.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(appointments.map((a) => a.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, Profile> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.user_id] = p;
      });

      // Group by user
      const groupMap: Record<string, ClientGroup> = {};
      for (const apt of appointments) {
        const uid = apt.user_id as string;
        if (!groupMap[uid]) {
          groupMap[uid] = {
            userId: uid,
            profile: profileMap[uid] || null,
            appointments: [],
          };
        }
        groupMap[uid].appointments.push(apt as CompletedAppointment);
      }

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
                  {group.appointments.length} {group.appointments.length === 1 ? "procedimento realizado" : "procedimentos realizados"}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="border-t border-border"
              >
                <div className="p-5 space-y-1.5">
                  {group.appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-heading text-xs font-semibold text-foreground truncate flex-1">
                        {apt.service_title}
                      </span>
                      {apt.session_number && (
                        <>
                          <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-body text-[11px] text-muted-foreground">{apt.session_number}</span>
                        </>
                      )}
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
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default AdminHistory;
