import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarX, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: string;
  service_title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string; phone: string } | null;
}

const AdminAgenda = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, appointment_date, appointment_time, status, created_at, user_id")
      .in("status", ["confirmed", "pending"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap: Record<string, { full_name: string; phone: string }> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      setAppointments(data.map((a) => ({ ...a, profiles: profileMap[a.user_id] || null })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, []);

  const handleCancel = async (id: string) => {
    const { error, count } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select("id");
    if (error) {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    } else {
      toast({ title: "Agendamento cancelado ✅" });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Agendamento excluído ✅" });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-card rounded-3xl border border-border p-8 text-center">
        <p className="font-body text-muted-foreground">Nenhum agendamento encontrado.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="font-heading text-lg font-bold text-foreground mb-4">
        Agendamentos ({appointments.length})
      </h2>
      <div className="space-y-3">
        {appointments.map((apt) => (
          <motion.div
            key={apt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-heading text-sm font-bold text-foreground truncate">{apt.service_title}</h4>
              <p className="font-body text-xs text-muted-foreground">
                {apt.appointment_date} • {apt.appointment_time}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {apt.profiles?.full_name || "—"} • {apt.profiles?.phone || "—"}
              </p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                apt.status === "confirmed"
                  ? "bg-primary/10 text-primary"
                  : "bg-gold/10 text-gold"
              }`}>
                {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleCancel(apt.id)}
                title="Cancelar (libera horário)"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
              >
                <CalendarX className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(apt.id)}
                title="Excluir permanentemente"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdminAgenda;
