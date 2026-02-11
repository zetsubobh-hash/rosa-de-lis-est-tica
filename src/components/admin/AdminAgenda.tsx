import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarX, Trash2, Phone, MapPin, Calendar, Clock, User, CalendarClock, X, CalendarIcon, MessageCircle, Handshake, ChevronDown, Hash, MinusCircle, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAllServicePrices, formatCents } from "@/hooks/useServicePrices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
  partner_id: string | null;
  profiles?: Profile | null;
}

interface PartnerOption {
  id: string;
  full_name: string;
}

interface ClientPlan {
  id: string;
  user_id: string;
  service_slug: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
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
  const [partnerOptions, setPartnerOptions] = useState<PartnerOption[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [expandedApt, setExpandedApt] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const fetchClientPlans = () => {
    supabase.from("client_plans").select("id, user_id, service_slug, service_title, plan_name, total_sessions, completed_sessions, status")
      .in("status", ["active", "completed"]).then(({ data }) => { if (data) setClientPlans(data as ClientPlan[]); });
  };

  useEffect(() => {
    supabase.from("partners").select("id, full_name").eq("is_active", true).order("full_name")
      .then(({ data }) => { if (data) setPartnerOptions(data); });
    fetchClientPlans();
  }, []);

  const updateSessions = async (planId: string, delta: number) => {
    const plan = clientPlans.find((p) => p.id === planId);
    if (!plan) return;
    const newCompleted = Math.max(0, Math.min(plan.total_sessions, plan.completed_sessions + delta));
    const newStatus = newCompleted >= plan.total_sessions ? "completed" : "active";
    setUpdatingPlan(planId);
    const { error } = await supabase.from("client_plans").update({ completed_sessions: newCompleted, status: newStatus }).eq("id", planId);
    if (error) {
      toast({ title: "Erro ao atualizar sessões", variant: "destructive" });
    } else {
      setClientPlans((prev) => prev.map((p) => p.id === planId ? { ...p, completed_sessions: newCompleted, status: newStatus } : p));
      toast({ title: newCompleted >= plan.total_sessions ? "Plano concluído! ✅" : "Sessão atualizada ✅" });
    }
    setUpdatingPlan(null);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, user_id, notes, partner_id")
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

    // Build notes with rescheduled flag
    const apt = appointments.find((a) => a.id === rescheduleId);
    let noteData: any = {};
    try { if (apt?.notes) noteData = JSON.parse(apt.notes); } catch { /* ignore */ }
    noteData.rescheduled = true;
    const updatedNotes = JSON.stringify(noteData);

    const { error } = await supabase
      .from("appointments")
      .update({ appointment_date: newDate, appointment_time: newTime, notes: updatedNotes })
      .eq("id", rescheduleId);

    if (error) {
      toast({ title: "Erro ao remarcar", variant: "destructive" });
    } else {
      toast({ title: "Agendamento remarcado ✅" });
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleId ? { ...a, appointment_date: newDate, appointment_time: newTime, notes: updatedNotes } : a
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

  const filterDateStr = filterDate ? format(filterDate, "yyyy-MM-dd") : "";
  const filtered = filterDateStr
    ? appointments.filter((a) => a.appointment_date === filterDateStr)
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 px-3 text-xs font-body justify-start",
                  !filterDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar por data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {filterDate && (
            <button
              onClick={() => setFilterDate(undefined)}
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
              className="bg-muted rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow"
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
                  {profile?.phone && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <a
                        href={`tel:${profile.phone.replace(/\D/g, "")}`}
                        className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        title={`Ligar para ${profile.full_name}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/55${profile.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                        title={`WhatsApp de ${profile.full_name}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Services list */}
                <div className="space-y-3 mb-4">
                  {group.map((apt) => {
                    const plan = clientPlans.find((p) => p.user_id === apt.user_id && p.service_slug === apt.service_slug);
                    const isExpanded = expandedApt === apt.id;
                    const progress = plan && plan.total_sessions > 0 ? (plan.completed_sessions / plan.total_sessions) * 100 : 0;
                    const isComplete = plan ? plan.completed_sessions >= plan.total_sessions : false;

                    return (
                    <div key={apt.id} className="rounded-xl border border-border overflow-hidden">
                      {/* Clickable header */}
                      <div
                        onClick={() => setExpandedApt(isExpanded ? null : apt.id)}
                        className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-heading text-sm font-bold text-foreground">
                            {apt.service_title}
                          </p>
                          <div className="flex items-center gap-2">
                            {plan && (
                              <span className="font-heading text-[11px] font-bold text-primary">
                                {plan.completed_sessions}/{plan.total_sessions}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {plan && <Progress value={progress} className="h-1.5 mb-2" />}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              apt.status === "confirmed"
                                ? "bg-primary/10 text-primary"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                          </span>
                          {isRescheduled(apt) && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                              Remarcado
                            </span>
                          )}
                          {isComplete && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                              Plano Completo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs font-body text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {apt.appointment_time}
                          </span>
                          <span className="font-heading font-bold text-primary">
                            {getAppointmentPrice(apt, allPrices)}
                          </span>
                        </div>
                      </div>

                      {/* Expandable section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-2 border-t border-border space-y-3">
                              {/* Session progress tracker */}
                              {plan ? (
                                <div>
                                  <p className="font-body text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-primary" />
                                    Progresso — {plan.plan_name}
                                  </p>
                                  <div className="flex gap-1.5 flex-wrap mb-3">
                                    {Array.from({ length: plan.total_sessions }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${
                                          i < plan.completed_sessions
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                        }`}
                                      >
                                        {i + 1}
                                      </div>
                                    ))}
                                  </div>
                                  {/* Admin controls */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateSessions(plan.id, -1); }}
                                      disabled={updatingPlan === plan.id || plan.completed_sessions === 0}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-all disabled:opacity-30"
                                    >
                                      <MinusCircle className="w-3.5 h-3.5" />
                                      Remover
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); updateSessions(plan.id, 1); }}
                                      disabled={updatingPlan === plan.id || isComplete}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-30"
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" />
                                      Marcar Sessão
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="font-body text-xs text-muted-foreground italic">Nenhum plano vinculado a este serviço.</p>
                              )}

                              {/* Partner assignment */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Handshake className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <select
                                  value={apt.partner_id || ""}
                                  onChange={async (e) => {
                                    const partnerId = e.target.value || null;
                                    const { error } = await supabase.from("appointments").update({ partner_id: partnerId }).eq("id", apt.id);
                                    if (!error) {
                                      setAppointments((prev) => prev.map((a) => a.id === apt.id ? { ...a, partner_id: partnerId } : a));
                                      toast({ title: partnerId ? "Parceiro atribuído ✅" : "Parceiro removido" });
                                    }
                                  }}
                                  className="flex-1 h-7 rounded-lg border border-border bg-background px-2 text-[11px] font-body text-foreground focus:ring-1 focus:ring-primary"
                                >
                                  <option value="">Sem parceiro</option>
                                  {partnerOptions.map((p) => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openReschedule(apt); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-colors"
                                >
                                  <CalendarClock className="w-3 h-3" />
                                  Remarcar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition-colors"
                                >
                                  <CalendarX className="w-3 h-3" />
                                  Cancelar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    );
                  })}
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
