import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, User, Calendar, Clock, ChevronDown, FileText, UserCheck, Package } from "lucide-react";
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
  notes: string | null;
  partner_id: string | null;
  partner_name?: string;
  service_slug: string;
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

      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, user_id, appointment_date, appointment_time, service_title, service_slug, session_number, plan_id, status, notes, partner_id")
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      if (!appointments || appointments.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(appointments.map((a) => a.user_id))];
      const partnerIds = [...new Set(appointments.map((a) => a.partner_id).filter(Boolean))] as string[];

      const [profilesRes, partnersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone, email, avatar_url").in("user_id", userIds),
        partnerIds.length > 0
          ? supabase.from("partners").select("id, full_name").in("id", partnerIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, Profile> = {};
      profilesRes.data?.forEach((p: any) => { profileMap[p.user_id] = p; });

      const partnerMap: Record<string, string> = {};
      partnersRes.data?.forEach((p: any) => { partnerMap[p.id] = p.full_name; });

      const groupMap: Record<string, ClientGroup> = {};
      for (const apt of appointments) {
        const uid = apt.user_id as string;
        if (!groupMap[uid]) {
          groupMap[uid] = { userId: uid, profile: profileMap[uid] || null, appointments: [] };
        }
        groupMap[uid].appointments.push({
          ...(apt as any),
          partner_name: apt.partner_id ? partnerMap[apt.partner_id] || "—" : undefined,
        });
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
                <div className="p-5 space-y-2">
                  {group.appointments.map((apt) => (
                    <div key={apt.id} className="p-3 rounded-xl border border-border hover:border-primary/20 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-foreground truncate flex-1">
                          {apt.service_title}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Concluído
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs font-body text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(apt.appointment_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {apt.appointment_time}
                        </span>
                        {apt.session_number && (
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Sessão {apt.session_number}
                          </span>
                        )}
                        {apt.partner_name && (
                          <span className="flex items-center gap-1 text-primary/70">
                            <UserCheck className="w-3 h-3" />
                            {apt.partner_name}
                          </span>
                        )}
                      </div>
                      {apt.notes && (
                        <p className="font-body text-xs text-muted-foreground/80 flex items-start gap-1">
                          <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                          {apt.notes}
                        </p>
                      )}
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
