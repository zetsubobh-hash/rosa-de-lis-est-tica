import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarX, Trash2, Phone, MapPin, Calendar, Clock, User, CalendarClock, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAllServicePrices, formatCents } from "@/hooks/useServicePrices";
import { Input } from "@/components/ui/input";

interface Profile {
  full_name: string;
  phone: string;
  email: string | null;
  sex: string;
  address: string;
  avatar_url: string | null;
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
  notes: string | null;
  profiles?: Profile | null;
}

const isRescheduled = (apt: Appointment): boolean => {
  if (!apt.notes) return false;
  try {
    const noteData = JSON.parse(apt.notes);
    return !!noteData.rescheduled;
  } catch { return false; }
};

const getAppointmentPrice = (apt: Appointment, allPrices: any[]): string => {
  if (apt.notes) {
    try {
      const noteData = JSON.parse(apt.notes);
      if (noteData.price_cents) return formatCents(noteData.price_cents);
    } catch { /* ignore */ }
  }
  const dbPrice = allPrices.find((p: any) => p.service_slug === apt.service_slug && p.plan_name === "Essencial");
  if (dbPrice) return formatCents(dbPrice.price_per_session_cents);
  return "—";
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

const HOURS = Array.from({ length: 11 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2, "0")}:00`;
});

const AdminAgenda = () => {
  const { toast } = useToast();
  const { prices: allPrices } = useAllServicePrices();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, user_id, notes")
      .in("status", ["confirmed", "pending"])
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((a) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, sex, address, avatar_url")
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

  const openReschedule = (apt: Appointment) => {
    setRescheduleId(apt.id);
    setNewDate(apt.appointment_date);
    setNewTime(apt.appointment_time);
  };

  const handleReschedule = async () => {
    if (!rescheduleId || !newDate || !newTime) return;
    setSaving(true);
    const { error } = await supabase
      .from("appointments")
      .update({ appointment_date: newDate, appointment_time: newTime })
      .eq("id", rescheduleId);

    if (error) {
      toast({ title: "Erro ao remarcar", variant: "destructive" });
    } else {
      // Mark as rescheduled in notes
      const apt = appointments.find((a) => a.id === rescheduleId);
      let noteData: any = {};
      try { if (apt?.notes) noteData = JSON.parse(apt.notes); } catch { /* ignore */ }
      noteData.rescheduled = true;
      await supabase.from("appointments").update({ notes: JSON.stringify(noteData) }).eq("id", rescheduleId);

      toast({ title: "Agendamento remarcado ✅" });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleId ? { ...a, appointment_date: newDate, appointment_time: newTime, notes: JSON.stringify(noteData) } : a
        )
      );
      setRescheduleId(null);
    }
    setSaving(false);
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

  const filtered = filterDate
    ? appointments.filter((a) => a.appointment_date === filterDate)
    : appointments;

  // Group by user_id + appointment_date
  const grouped = filtered.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = `${apt.user_id}_${apt.appointment_date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(apt);
    return acc;
  }, {});

  // Sort each group by time
  const groupedEntries = Object.values(grouped).map((group) =>
    group.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Agendamentos ({filtered.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-9 h-9 text-xs font-body w-40"
              placeholder="Filtrar por data"
            />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              className="h-9 px-3 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum agendamento para esta data.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedEntries.map((group, i) => {
          const first = group[0];
          const profile = first.profiles;

          return (
            <motion.div
              key={`${first.user_id}_${first.appointment_date}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header with date */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <span className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(first.appointment_date)}
                </span>
                <span className="font-body text-xs text-muted-foreground">
                  {group.length} {group.length === 1 ? "serviço" : "serviços"}
                </span>
              </div>

              <div className="p-5">
                {/* Client info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : profile ? (
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

                {/* Services list */}
                <div className="space-y-3 mb-4">
                  {group.map((apt) => (
                    <div key={apt.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-heading text-sm font-bold text-foreground truncate">
                          {apt.service_title}
                        </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRescheduled(apt) && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                            Remarcado
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            apt.status === "confirmed"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                        </span>
                      </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-body text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.appointment_time}
                        </span>
                        <span className="font-heading font-bold text-primary">
                          {getAppointmentPrice(apt, allPrices)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openReschedule(apt)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-colors"
                        >
                          <CalendarClock className="w-3 h-3" />
                          Remarcar
                        </button>
                        <button
                          onClick={() => handleCancel(apt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-colors"
                        >
                          <CalendarX className="w-3 h-3" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* Reschedule Modal */}
      <AnimatePresence>
        {rescheduleId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRescheduleId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-heading text-base font-bold text-foreground">Remarcar Agendamento</h3>
                <button onClick={() => setRescheduleId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Nova Data</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="font-body"
                  />
                </div>
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Novo Horário</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => setNewTime(h)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          newTime === h
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleReschedule}
                  disabled={saving || !newDate || !newTime}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Confirmar Remarcação"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminAgenda;
