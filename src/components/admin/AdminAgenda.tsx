import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarX, Trash2, Phone, MapPin, Calendar, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { services } from "@/data/services";

interface Profile {
  full_name: string;
  phone: string;
  email: string | null;
  sex: string;
  address: string;
}

interface Appointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: Profile | null;
}

const getServicePrice = (slug: string) => {
  const svc = services.find((s) => s.slug === slug);
  return svc?.price || "—";
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const AdminAgenda = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, user_id")
      .in("status", ["confirmed", "pending"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, sex, address")
        .in("user_id", userIds);

      const profileMap: Record<string, Profile> = {};
      profiles?.forEach((p: any) => {
        profileMap[p.user_id] = p;
      });

      setAppointments(data.map((a) => ({ ...a, profiles: profileMap[a.user_id] || null })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    const { error } = await supabase
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
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-body text-muted-foreground">Nenhum agendamento encontrado.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Agendamentos ({appointments.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appointments.map((apt, i) => {
          const profile = apt.profiles;
          const price = getServicePrice(apt.service_slug);

          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header with status */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <span className="font-heading text-sm font-bold text-foreground truncate">
                  {apt.service_title}
                </span>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    apt.status === "confirmed"
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                </span>
              </div>

              <div className="p-5">
                {/* Client info */}
                <div className="flex items-start gap-3 mb-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {profile ? (
                      <span className="font-heading text-sm font-bold text-primary">
                        {getInitials(profile.full_name)}
                      </span>
                    ) : (
                      <User className="w-5 h-5 text-primary/50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-semibold text-foreground truncate">
                      {profile?.full_name || "Cliente não identificado"}
                    </p>
                    {profile?.phone && (
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {profile.phone}
                      </p>
                    )}
                    {profile?.email && (
                      <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                        {profile.email}
                      </p>
                    )}
                    {profile?.address && (
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{profile.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Date, time, price */}
                <div className="flex items-center gap-4 text-xs font-body text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(apt.appointment_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {apt.appointment_time}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="font-heading text-sm font-bold text-primary">{price}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancel(apt.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-colors"
                  >
                    <CalendarX className="w-3.5 h-3.5" />
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(apt.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AdminAgenda;
