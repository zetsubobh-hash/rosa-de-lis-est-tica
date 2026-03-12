import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarX, Trash2, Phone, MapPin, Calendar, Clock, User, CalendarClock, X, CalendarIcon, MessageCircle, Handshake, ChevronDown, Hash, MinusCircle, PlusCircle, CheckCircle2, CalendarPlus, Banknote, UserPlus } from "lucide-react";
import NewClientInlineForm from "@/components/admin/NewClientInlineForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { useToast } from "@/hooks/use-toast";
import { useAllServicePrices, formatCents } from "@/hooks/useServicePrices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import SessionScheduleModal from "@/components/SessionScheduleModal";
import DayTimelineView from "@/components/admin/DayTimelineView";
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
  plan_id: string | null;
  session_number: number | null;
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
  const [cancelAllPlanId, setCancelAllPlanId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{ planId: string; sessionNum: number } | null>(null);
  const [dragConfirm, setDragConfirm] = useState<{ appointmentId: string; newTime: string; apt: Appointment } | null>(null);

  // Schedule modal state (for admin scheduling sessions)
  const [scheduleModal, setScheduleModal] = useState<{
    planId: string; sessionNumber: number; serviceSlug: string; serviceTitle: string; userId: string; partnerId?: string | null;
  } | null>(null);

  // Reschedule state
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState<Date>(new Date());

  // Quick-book from timeline slot
  const [quickBook, setQuickBook] = useState<{ time: string } | null>(null);
  const [qbUserId, setQbUserId] = useState("");
  const [qbServiceSlug, setQbServiceSlug] = useState("");
  const [qbSaving, setQbSaving] = useState(false);
  const [qbShowNewClient, setQbShowNewClient] = useState(false);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [allServices, setAllServices] = useState<{ slug: string; title: string }[]>([]);

  const fetchAll = async () => {
    setLoading(true);

    // Run ALL queries in parallel
    const [appointmentsRes, profilesRes, partnersRes, plansRes, servicesRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, status, created_at, user_id, notes, partner_id, plan_id, session_number")
        .in("status", ["confirmed", "pending", "completed"])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
      supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, sex, address, avatar_url"),
      supabase
        .from("partners")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("client_plans")
        .select("id, user_id, service_slug, service_title, plan_name, total_sessions, completed_sessions, status")
        .in("status", ["active", "completed"]),
      supabase
        .from("services")
        .select("slug, title")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    if (partnersRes.data) setPartnerOptions(partnersRes.data);
    if (plansRes.data) setClientPlans(plansRes.data as ClientPlan[]);
    if (servicesRes.data) setAllServices(servicesRes.data);

    const profileMap: Record<string, Profile> = {};
    profilesRes.data?.forEach((p: any) => {
      profileMap[p.user_id] = p;
    });

    if (profilesRes.data) {
      setAllProfiles(profilesRes.data.map((p: any) => ({ user_id: p.user_id, full_name: p.full_name })));
    }

    if (appointmentsRes.data) {
      setAppointments(
        appointmentsRes.data.map((a) => ({ ...a, profiles: profileMap[a.user_id] || null }))
      );
    }

    setLoading(false);
  };

  const updateSessions = async (planId: string, delta: number, customToast?: string) => {
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
      toast({ title: customToast || (newCompleted >= plan.total_sessions ? "Plano concluído! ✅" : "Sessão atualizada ✅") });

      if (newStatus === "completed") {
        await supabase.from("appointments").update({ status: "completed" }).eq("plan_id", planId).in("status", ["confirmed", "pending"]);
        await supabase.from("appointments").update({ status: "completed" }).eq("user_id", plan.user_id).eq("service_slug", plan.service_slug).in("status", ["confirmed", "pending"]);
        setAppointments((prev) => prev.map((a) => {
          if (a.plan_id === planId) return { ...a, status: "completed" };
          if (a.user_id === plan.user_id && a.service_slug === plan.service_slug) return { ...a, status: "completed" };
          return a;
        }));
      }
    }
    setUpdatingPlan(null);
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("admin-agenda-appointments-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleComplete = async (apt: Appointment) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", apt.id);
    if (error) {
      toast({ title: "Erro ao finalizar", variant: "destructive" });
    } else {
      // Also update plan sessions if linked
      const plan = clientPlans.find((p) => p.user_id === apt.user_id && p.service_slug === apt.service_slug);
      if (plan && plan.completed_sessions < plan.total_sessions) {
        const newCompleted = Math.min(plan.total_sessions, plan.completed_sessions + 1);
        const newStatus = newCompleted >= plan.total_sessions ? "completed" : "active";
        await supabase.from("client_plans").update({ completed_sessions: newCompleted, status: newStatus }).eq("id", plan.id);
        setClientPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, completed_sessions: newCompleted, status: newStatus } : p));
      }
      toast({ title: "Procedimento finalizado ✅" });
      setAppointments((prev) => prev.map((a) => a.id === apt.id ? { ...a, status: "completed" } : a));
    }
  };

  const handleConfirmPayment = async (apt: Appointment) => {
    try {
      // Try to update existing pending payment, or create a new one
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingPayment) {
        await supabase.from("payments")
          .update({ status: "confirmed" })
          .eq("id", existingPayment.id);
      } else {
        await supabase.from("payments").insert({
          user_id: apt.user_id,
          appointment_id: apt.id,
          method: "pix_manual",
          status: "confirmed",
        });
      }

      // Update appointment to confirmed
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", apt.id);
      if (error) throw error;

      // Auto-create client plan if applicable
      let planName = "Essencial";
      let sessions = 1;
      if (apt.notes) {
        try {
          const noteData = JSON.parse(apt.notes);
          if (noteData.plan) planName = noteData.plan;
          if (noteData.sessions) sessions = noteData.sessions;
        } catch { /* ignore */ }
      }
      if (sessions <= 1 && allPrices.length > 0) {
        const dbPrice = allPrices.find(
          (p: any) => p.service_slug === apt.service_slug && p.plan_name === planName
        );
        if (dbPrice) sessions = dbPrice.sessions;
      }
      await supabase.from("client_plans").insert({
        user_id: apt.user_id,
        service_slug: apt.service_slug,
        service_title: apt.service_title,
        plan_name: planName,
        total_sessions: sessions,
        completed_sessions: 0,
        status: "active",
        created_by: "admin",
        appointment_id: apt.id,
      });

      // Update local state
      setAppointments((prev) =>
        prev.map((a) => a.id === apt.id ? { ...a, status: "confirmed" } : a)
      );

      // Fire WhatsApp notification
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${SUPABASE_URL}/functions/v1/evolution-notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ appointment_ids: [apt.id] }),
      }).catch((e) => console.warn("WhatsApp notification failed:", e));

      toast({ title: "Pagamento confirmado e agendamento ativado ✅" });
      await fetchAll();
    } catch (err) {
      console.error("[ConfirmPayment] Error:", err);
      toast({ title: "Erro ao confirmar pagamento", variant: "destructive" });
    }
  };


  const handlePartnerAssign = async (aptId: string, partnerId: string | null) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast({ title: "Sessão expirada", description: "Faça login novamente para continuar.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-update-appointment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session.access_token}`,
            "apikey": SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ appointment_id: aptId, partner_id: partnerId }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error("[PartnerAssign] Error:", result);
        toast({ title: "Erro ao atribuir parceiro", description: result.error || "Erro desconhecido", variant: "destructive" });
      } else {
        toast({ title: partnerId ? "Parceiro atribuído ✅" : "Parceiro removido" });
        // Refetch all data to ensure UI is fully synced with DB
        await fetchAll();
        // Broadcast to other admin components (e.g. Partner View) for instant sync
        supabase.channel("partner-assign-sync").send({
          type: "broadcast",
          event: "partner-changed",
          payload: { appointment_id: aptId, partner_id: partnerId },
        });
      }
    } catch (err) {
      console.error("[PartnerAssign] Fetch error:", err);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor.", variant: "destructive" });
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

      // Fire reschedule WhatsApp notification (fire-and-forget)
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${SUPABASE_URL}/functions/v1/evolution-notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ appointment_ids: [rescheduleId], type: "reschedule" }),
      }).catch((e) => console.warn("Reschedule WhatsApp notification failed:", e));
    }
    setSaving(false);
  };

  /** Drag-and-drop reschedule: show confirmation first */
  const handleDragReschedule = (appointmentId: string, newTime: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;

    // Don't do anything if dropped on the same time
    if (apt.appointment_time === newTime) return;

    // Block completed appointments
    if (apt.status === "completed") {
      toast({ title: "Procedimento já realizado", description: "Não é possível remarcar um procedimento concluído.", variant: "destructive" });
      return;
    }

    // Block past time slots
    const now = new Date();
    const [nh, nm] = [now.getHours(), now.getMinutes()];
    const [th, tm] = newTime.split(":").map(Number);
    if (th * 60 + tm < nh * 60 + nm) {
      toast({ title: "Horário já passou", description: "Não é possível remarcar para um horário que já passou.", variant: "destructive" });
      return;
    }

    // Check if slot is already occupied
    const dateStr = filterDate ? format(filterDate, "yyyy-MM-dd") : apt.appointment_date;
    const conflict = appointments.find(
      (a) => a.id !== appointmentId && a.appointment_date === dateStr && a.appointment_time === newTime
    );
    if (conflict) {
      toast({ title: "Horário ocupado", description: `Já existe um agendamento às ${newTime}.`, variant: "destructive" });
      return;
    }

    // Show confirmation popup
    setDragConfirm({ appointmentId, newTime, apt });
  };

  const confirmDragReschedule = async () => {
    if (!dragConfirm) return;
    const { appointmentId, newTime, apt } = dragConfirm;
    setDragConfirm(null);

    // Build notes with rescheduled flag
    let noteData: any = {};
    try { if (apt.notes) noteData = JSON.parse(apt.notes); } catch { /* ignore */ }
    noteData.rescheduled = true;
    const updatedNotes = JSON.stringify(noteData);

    const { error } = await supabase
      .from("appointments")
      .update({ appointment_time: newTime, notes: updatedNotes })
      .eq("id", appointmentId);

    if (error) {
      toast({ title: "Erro ao remarcar", variant: "destructive" });
      return;
    }

    toast({ title: `Remarcado para ${newTime} ✅` });
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, appointment_time: newTime, notes: updatedNotes } : a
      )
    );

    // Fire reschedule WhatsApp notification (fire-and-forget)
    const { data: { session } } = await supabase.auth.getSession();
    fetch(`${SUPABASE_URL}/functions/v1/evolution-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ appointment_ids: [appointmentId], type: "reschedule" }),
    }).catch((e) => console.warn("Drag reschedule WhatsApp notification failed:", e));
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

  const filterDateStr = format(filterDate, "yyyy-MM-dd");
  const filtered = appointments.filter((a) => a.appointment_date === filterDateStr).filter((a) => {
    // Only hide appointments that are explicitly linked to a completed plan
    if (a.plan_id) {
      const linkedPlan = clientPlans.find((p) => p.id === a.plan_id);
      if (linkedPlan && linkedPlan.status === "completed" && a.status !== "completed") return false;
    }
    return true;
  });

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
          <button
            onClick={() => setFilterDate(new Date())}
            className={cn(
              "h-9 px-3 rounded-lg text-xs font-semibold font-body border transition-colors",
              format(filterDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Hoje
          </button>
          <CalendarPopoverFilter date={filterDate} onSelect={setFilterDate} align="end" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum agendamento para {format(filterDate, "dd/MM/yyyy")}.</p>
        </div>
      ) : null}

      <DayTimelineView
        appointments={filtered}
        expandedAptId={expandedApt}
        onSelectAppointment={(id) => setExpandedApt(expandedApt === id ? null : id)}
        clientPlans={clientPlans}
        partnerOptions={partnerOptions}
        allPrices={allPrices}
        updatingPlan={updatingPlan}
        onConfirmPayment={handleConfirmPayment}
        onComplete={handleComplete}
        onReschedule={openReschedule}
        onCancel={handleCancel}
        onPartnerAssign={handlePartnerAssign}
        onUpdateSessions={updateSessions}
        isRescheduled={isRescheduled}
        getAppointmentPrice={getAppointmentPrice}
        getInitials={getInitials}
        onSlotClick={(time) => {
          setQuickBook({ time });
          setQbUserId("");
          setQbServiceSlug("");
          setQbShowNewClient(false);
        }}
        onDragReschedule={handleDragReschedule}
        onScheduleSession={(params) => setScheduleModal(params)}
      />

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

      {/* Cancel All Confirmation Dialog */}
      <AlertDialog open={!!cancelAllPlanId} onOpenChange={(open) => !open && setCancelAllPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar todos os agendamentos?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os agendamentos vinculados a este plano serão cancelados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!cancelAllPlanId) return;
                const planApts = appointments.filter((a) => a.plan_id === cancelAllPlanId && a.status !== "cancelled");
                for (const apt of planApts) {
                  await supabase.from("appointments").update({ status: "cancelled" }).eq("id", apt.id);
                }
                setAppointments((prev) => prev.filter((a) => a.plan_id !== cancelAllPlanId || a.status === "cancelled"));
                toast({ title: `${planApts.length} agendamento(s) cancelado(s) ✅` });
                setCancelAllPlanId(null);
              }}
            >
              Cancelar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Schedule Modal (admin) */}
      {scheduleModal && (
        <SessionScheduleModal
          open={!!scheduleModal}
          onClose={() => setScheduleModal(null)}
          onScheduled={() => { fetchAll(); }}
          planId={scheduleModal.planId}
          sessionNumber={scheduleModal.sessionNumber}
          serviceSlug={scheduleModal.serviceSlug}
          serviceTitle={scheduleModal.serviceTitle}
          userId={scheduleModal.userId}
          partnerId={scheduleModal.partnerId}
        />
      )}

      {/* Quick Book Modal */}
      <AnimatePresence>
        {quickBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setQuickBook(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center -mt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Agendar às {quickBook.time}
                </h3>
                <button onClick={() => setQuickBook(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-body text-sm text-muted-foreground">
                {filterDate ? format(filterDate, "dd/MM/yyyy") : ""}
              </p>

              {/* Client select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-body text-xs font-semibold text-foreground">Cliente</label>
                  <button
                    type="button"
                    onClick={() => setQbShowNewClient(!qbShowNewClient)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    {qbShowNewClient ? <><X className="w-3 h-3" /> Cancelar</> : <><UserPlus className="w-3 h-3" /> Novo Cliente</>}
                  </button>
                </div>

                {qbShowNewClient ? (
                  <NewClientInlineForm
                    onClientCreated={(client) => {
                      setAllProfiles(prev => [{ user_id: client.user_id, full_name: client.full_name }, ...prev]);
                      setQbUserId(client.user_id);
                      setQbShowNewClient(false);
                    }}
                    onCancel={() => setQbShowNewClient(false)}
                  />
                ) : (
                  <select
                    value={qbUserId}
                    onChange={(e) => setQbUserId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 font-body text-sm text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione o cliente...</option>
                    {allProfiles.map((p) => (
                      <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service select */}
              <div>
                <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Procedimento</label>
                <select
                  value={qbServiceSlug}
                  onChange={(e) => setQbServiceSlug(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 font-body text-sm text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecione o procedimento...</option>
                  {allServices.map((s) => (
                    <option key={s.slug} value={s.slug}>{s.title}</option>
                  ))}
                </select>
              </div>

              <button
                disabled={qbSaving || !qbUserId || !qbServiceSlug || !filterDate}
                onClick={async () => {
                  if (!filterDate || !qbUserId || !qbServiceSlug) return;
                  setQbSaving(true);
                  const service = allServices.find((s) => s.slug === qbServiceSlug);
                  const dateStr = format(filterDate, "yyyy-MM-dd");
                  const { error } = await supabase.from("appointments").insert({
                    user_id: qbUserId,
                    service_slug: qbServiceSlug,
                    service_title: service?.title || qbServiceSlug,
                    appointment_date: dateStr,
                    appointment_time: quickBook.time,
                    status: "confirmed",
                  });
                  setQbSaving(false);
                  if (error) {
                    toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Agendamento criado ✅" });
                    setQuickBook(null);
                    fetchAll();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {qbSaving ? "Agendando..." : "Confirmar Agendamento"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag reschedule confirmation modal */}
      <AnimatePresence>
        {dragConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setDragConfirm(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <CalendarClock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">Confirmar alteração de horário?</h3>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    Uma notificação será enviada via WhatsApp para o cliente e o parceiro.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 mb-5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-heading text-sm font-bold text-foreground">
                    {dragConfirm.apt.profiles?.full_name || "Cliente"}
                  </span>
                </div>
                <p className="font-body text-xs text-muted-foreground">
                  {dragConfirm.apt.service_title} — {formatDate(dragConfirm.apt.appointment_date)}
                </p>
                <div className="flex items-center gap-2 font-body text-sm">
                  <span className="text-muted-foreground">{dragConfirm.apt.appointment_time}</span>
                  <span className="text-primary font-bold">→</span>
                  <span className="font-bold text-primary">{dragConfirm.newTime}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDragConfirm(null)}
                  className="h-12 rounded-xl border border-border text-muted-foreground font-body text-sm font-bold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDragReschedule}
                  className="h-12 rounded-xl bg-primary text-primary-foreground font-body text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  Confirmar Alteração
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
