import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Bell, LogOut, Home, CalendarCheck,
  Users, History, ClipboardList, CheckCircle2, FileText, Share2, X, Smartphone, Gift, AlertCircle, XCircle, UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import AnamnesisModal from "@/components/AnamnesisModal";
import UserHistoryModal from "@/components/admin/UserHistoryModal";
import SessionScheduleModal from "@/components/SessionScheduleModal";
import DayTimelineView from "@/components/admin/DayTimelineView";
import NewClientInlineForm from "@/components/admin/NewClientInlineForm";
import CalendarPopoverFilter from "@/components/admin/CalendarPopoverFilter";
import WelcomeRoulette from "@/components/WelcomeRoulette";

interface SessionInfo {
  date: string;
  time: string;
  session_number: number;
  status: string;
}

interface Appointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  user_id: string;
  plan_id: string | null;
  session_number: number | null;
  notes?: string | null;
  total_sessions?: number | null;
  completed_sessions?: number | null;
  planSessions?: SessionInfo[];
  profile?: {
    full_name: string;
    avatar_url: string | null;
  } | null;
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
  profile?: { full_name: string; avatar_url: string | null } | null;
  nextAppointment?: { date: string; time: string } | null;
  scheduledSessions?: { date: string; time: string; session_number: number; status: string }[];
}

type Tab = "agenda" | "clientes" | "historico";

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isAppointmentOverdue = (
  apt: { appointment_date: string; appointment_time: string; status: string },
  referenceDate: Date
) => {
  if (!["confirmed", "pending"].includes(apt.status)) return false;
  const todayStr = formatLocalDate(referenceDate);
  if (apt.appointment_date > todayStr) return false;
  if (apt.appointment_date < todayStr) return true;
  // Same day — check if time has passed (add 30min buffer for the session itself)
  const [h, m] = apt.appointment_time.split(":").map(Number);
  const aptMinutes = h * 60 + m + 30; // 30min after start
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  return nowMinutes >= aptMinutes;
};

const PartnerDashboard = () => {
  const { user, signOut } = useAuth();
  const { logoWhite: logo } = useBrandingLogos();
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  
  const [permissions, setPermissions] = useState({
    can_manage_agenda: false,
    can_create_appointments: false,
    can_reschedule: false,
    can_cancel: false,
    can_complete: false,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [newNotifications, setNewNotifications] = useState<string[]>([]);
  const [anamnesisClient, setAnamnesisClient] = useState<{ userId: string; name: string } | null>(null);
  const [historyClient, setHistoryClient] = useState<{ userId: string; name: string } | null>(null);
  const [showInstallQR, setShowInstallQR] = useState(false);
  const [showDemoRoulette, setShowDemoRoulette] = useState(false);
  const [filterDate, setFilterDate] = useState<string | null>(formatLocalDate(new Date()));
  const [expandedAptId, setExpandedAptId] = useState<string | null>(null);
  const [quickBook, setQuickBook] = useState<{ time: string } | null>(null);
  const [qbUserId, setQbUserId] = useState("");
  const [qbServiceSlug, setQbServiceSlug] = useState("");
  const [qbSaving, setQbSaving] = useState(false);
  const [qbShowNewClient, setQbShowNewClient] = useState(false);
  const [allProfiles, setAllProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [allServices, setAllServices] = useState<{ slug: string; title: string }[]>([]);
  const [scheduleModal, setScheduleModal] = useState<{
    planId: string; sessionNumber: number; serviceSlug: string; serviceTitle: string; userId: string; partnerId?: string | null;
  } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const installUrl = typeof window !== "undefined" ? `${window.location.origin}/instalar` : "/instalar";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(installUrl)}`;

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const init = async () => {
      const { data: partner } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!partner) {
        navigate("/", { replace: true });
        return;
      }

      setPartnerId(partner.id);
      setPartnerName(partner.full_name);
      const p = partner as any;
      const canManageAgenda = !!p.can_manage_agenda;
      const perms = {
        can_manage_agenda: canManageAgenda,
        can_create_appointments: canManageAgenda || !!p.can_create_appointments,
        can_reschedule: canManageAgenda || !!p.can_reschedule,
        can_cancel: canManageAgenda || !!p.can_cancel,
        can_complete: canManageAgenda || !!p.can_complete,
      };
      setPermissions(perms);

      const today = formatLocalDate(new Date());

      // Fetch upcoming and past appointments in parallel
      const [{ data: upcoming }, { data: past }] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, notes")
          .eq("partner_id", partner.id)
          .gte("appointment_date", today)
          .in("status", ["confirmed", "pending"])
          .order("appointment_date")
          .order("appointment_time"),
        supabase
          .from("appointments")
          .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, notes")
          .eq("partner_id", partner.id)
          .in("status", ["completed", "confirmed"])
          .lt("appointment_date", today)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false })
          .limit(50),
      ]);

      const allApts = [...(upcoming || []), ...(past || [])];
      const userIds = [...new Set(allApts.map((a) => a.user_id))];
      const planIds = [...new Set(allApts.filter((a) => a.plan_id).map((a) => a.plan_id!))];

      // Fetch profiles + plans by ID + ALL active plans for these users (to match by service)
      const [{ data: profiles }, planByIdResult, clientPlansResult] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name, avatar_url, phone").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        planIds.length > 0
          ? supabase.from("client_plans").select("id, total_sessions, completed_sessions, user_id, service_title, plan_name, status, service_slug").in("id", planIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length > 0
          ? supabase.from("client_plans").select("id, total_sessions, completed_sessions, user_id, service_title, plan_name, status, service_slug").in("user_id", userIds).eq("status", "active")
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      // Build plan map from both sources (by ID and by user)
      const planMap: Record<string, any> = {};
      planByIdResult?.data?.forEach((p: any) => { planMap[p.id] = p; });
      clientPlansResult?.data?.forEach((p: any) => { if (!planMap[p.id]) planMap[p.id] = p; });

      // Build user+service -> plan lookup for appointments without plan_id
      const userServicePlanMap: Record<string, any> = {};
      clientPlansResult?.data?.forEach((p: any) => {
        const key = `${p.user_id}::${p.service_slug}`;
        if (!userServicePlanMap[key]) userServicePlanMap[key] = p;
      });

      // Collect all plan IDs we need session data for
      const allPlanIds = [...new Set([
        ...planIds,
        ...(clientPlansResult?.data?.map((p: any) => p.id) || []),
      ])];

      // Fetch all appointments for these plans
      const { data: allPlanAptsData } = allPlanIds.length > 0
        ? await supabase.from("appointments").select("plan_id, session_number, appointment_date, appointment_time, status").in("plan_id", allPlanIds).order("session_number")
        : { data: [] as any[] };

      const planAptsMap: Record<string, { date: string; time: string; session_number: number; status: string }[]> = {};
      allPlanAptsData?.forEach((a: any) => {
        if (!a.plan_id) return;
        if (!planAptsMap[a.plan_id]) planAptsMap[a.plan_id] = [];
        planAptsMap[a.plan_id].push({ date: a.appointment_date, time: a.appointment_time, session_number: a.session_number || 0, status: a.status });
      });

      const enrichApt = (a: any): Appointment => {
        // Try direct plan_id first, then fallback to user+service match
        let plan = a.plan_id ? planMap[a.plan_id] : null;
        let resolvedPlanId = a.plan_id;
        if (!plan && a.service_slug) {
          const key = `${a.user_id}::${a.service_slug}`;
          plan = userServicePlanMap[key] || null;
          if (plan) resolvedPlanId = plan.id;
        }
        return {
          ...a,
          profile: profileMap[a.user_id] || null,
          plan_id: resolvedPlanId || a.plan_id,
          total_sessions: plan?.total_sessions || null,
          completed_sessions: plan?.completed_sessions || null,
          planSessions: resolvedPlanId ? planAptsMap[resolvedPlanId] || [] : [],
        };
      };

      setAppointments((upcoming || []).map(enrichApt));
      setPastAppointments((past || []).map(enrichApt));

      // Build client plans with next appointment info
      const allPlansData = [
        ...(planByIdResult?.data || []),
        ...(clientPlansResult?.data || []),
      ].filter((p: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === p.id) === i);

      if (allPlansData.length > 0) {
        const plans: ClientPlan[] = allPlansData
          .filter((p: any) => p.status === "active")
          .map((p: any) => {
            const nextApt = (upcoming || []).find((a) => a.plan_id === p.id);
            return {
              ...p,
              profile: profileMap[p.user_id] || null,
              nextAppointment: nextApt ? { date: nextApt.appointment_date, time: nextApt.appointment_time } : null,
              scheduledSessions: planAptsMap[p.id] || [],
            };
          });
        setClientPlans(plans);
      }

      setLoading(false);
    };

    init();
  }, [user, navigate]);

  // Fetch all profiles + services for quick-book
  useEffect(() => {
    if (!permissions.can_create_appointments) return;
    const load = async () => {
      const [{ data: profs }, { data: svcs }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").order("full_name"),
        supabase.from("services").select("slug, title").eq("is_active", true).order("sort_order"),
      ]);
      setAllProfiles(profs || []);
      setAllServices(svcs || []);
    };
    load();
  }, [permissions.can_create_appointments]);

  // Real-time subscription
  useEffect(() => {
    if (!partnerId) return;

    const channel = supabase
      .channel("partner-appointments")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments", filter: `partner_id=eq.${partnerId}` },
        async (payload) => {
          const apt = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, full_name, phone, avatar_url")
            .eq("user_id", apt.user_id)
            .maybeSingle();

          setAppointments((prev) => {
            const updated: Appointment = { ...apt, profile: profile || null };
            const exists = prev.find((a) => a.id === apt.id);
            if (exists) return prev.map((a) => a.id === apt.id ? updated : a);
            return [...prev, updated].sort((a, b) =>
              `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`)
            );
          });

          setNewNotifications((prev) => [...prev, `Novo: ${apt.service_title} em ${formatDate(apt.appointment_date)} às ${apt.appointment_time}`]);
          setTimeout(() => setNewNotifications((prev) => prev.slice(1)), 8000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerId]);

  /* ── Decision modal state ── */
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    apt: Appointment;
    type: "completed" | "cancelled";
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [cancelReason, setCancelReason] = useState<"no_show" | "other">("no_show");
  const [cancelReasonText, setCancelReasonText] = useState("");

  const openDecisionModal = (apt: Appointment, type: "completed" | "cancelled") => {
    setDecisionModal({ apt, type });
    setDecisionNotes("");
    setCancelReason("no_show");
    setCancelReasonText("");
  };

  /* ── Agenda management (when canManageAgenda is true) ── */
  const [dragConfirm, setDragConfirm] = useState<{
    appointmentId: string;
    newTime: string;
    apt: Appointment;
  } | null>(null);

  const handleDragReschedule = (appointmentId: string, newTime: string) => {
    if (!permissions.can_reschedule) return;
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    if (apt.appointment_time === newTime) return;
    if (apt.status === "completed") {
      toast.error("Não é possível remarcar um procedimento concluído.");
      return;
    }
    const now = new Date();
    const [th, tm] = newTime.split(":").map(Number);
    if (th * 60 + tm < now.getHours() * 60 + now.getMinutes()) {
      toast.error("Não é possível remarcar para um horário que já passou.");
      return;
    }
    const conflict = appointments.find(
      (a) => a.id !== appointmentId && a.appointment_date === apt.appointment_date && a.appointment_time === newTime
    );
    if (conflict) {
      toast.error(`Já existe um agendamento às ${newTime}.`);
      return;
    }
    setDragConfirm({ appointmentId, newTime, apt });
  };

  const confirmDragReschedule = async () => {
    if (!dragConfirm) return;
    const { appointmentId, newTime, apt } = dragConfirm;
    setDragConfirm(null);
    let noteData: any = {};
    try { if (apt.notes) noteData = JSON.parse(apt.notes); } catch { /* ignore */ }
    noteData.rescheduled = true;
    const updatedNotes = JSON.stringify(noteData);
    const { error } = await supabase
      .from("appointments")
      .update({ appointment_time: newTime, notes: updatedNotes })
      .eq("id", appointmentId);
    if (error) {
      toast.error("Erro ao remarcar.");
      return;
    }
    toast.success(`Remarcado para ${newTime} ✅`);
    setAppointments((prev) =>
      prev.map((a) => a.id === appointmentId ? { ...a, appointment_time: newTime, notes: updatedNotes } : a)
    );
    // WhatsApp notification (fire-and-forget)
    const { data: { session } } = await supabase.auth.getSession();
    fetch(`${SUPABASE_URL}/functions/v1/evolution-notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}`, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ appointment_ids: [appointmentId], type: "reschedule" }),
    }).catch(() => {});
  };

  const handleCancelAppointment = async (id: string) => {
    if (!permissions.can_cancel) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar agendamento.");
      return;
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    toast.success("Agendamento cancelado ✅");
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal) return;
    const { apt, type } = decisionModal;
    const completed = type === "completed";

    // Validate cancel reason
    if (!completed && cancelReason === "other" && !cancelReasonText.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    setCompletingId(apt.id);
    try {
      const newStatus = completed ? "completed" : "cancelled";

      // Build notes JSON
      let existingNotes: Record<string, any> = {};
      if (apt.notes) {
        try { existingNotes = JSON.parse(apt.notes); } catch { /* ignore */ }
      }

      const notesPayload: Record<string, any> = {
        ...existingNotes,
        ...(completed
          ? { session_observation: decisionNotes.trim() || null, completed_at: new Date().toISOString() }
          : {
              cancel_reason: cancelReason === "no_show" ? "Cliente não apareceu" : cancelReasonText.trim(),
              cancelled_at: new Date().toISOString(),
            }
        ),
      };

      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ status: newStatus, notes: JSON.stringify(notesPayload) })
        .eq("id", apt.id);

      if (appointmentError) throw appointmentError;

      // If completed and has a plan, increment completed_sessions
      if (completed && apt.plan_id) {
        const plan = clientPlans.find(p => p.id === apt.plan_id);
        if (plan) {
          const newCompleted = Math.min(plan.completed_sessions + 1, plan.total_sessions);
          const newPlanStatus = newCompleted >= plan.total_sessions ? "completed" : "active";
          const { error: planError } = await supabase
            .from("client_plans")
            .update({
              completed_sessions: newCompleted,
              status: newPlanStatus,
            })
            .eq("id", plan.id);

          if (planError) throw planError;

          setClientPlans(prev => prev.map(p => p.id === plan.id ? { ...p, completed_sessions: newCompleted, status: newPlanStatus } : p));
        }
      }

      // Move from appointments to past
      setAppointments(prev => prev.filter(a => a.id !== apt.id));
      if (completed) {
        setPastAppointments(prev => [{ ...apt, status: "completed" }, ...prev]);
      }

      toast.success(completed ? "✅ Sessão marcada como realizada!" : "❌ Sessão marcada como não realizada.");
      setDecisionModal(null);
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setCompletingId(null);
    }
  };

  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const pastGrouped = pastAppointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const referenceNow = new Date(nowTick);
  const today = formatLocalDate(referenceNow);
  const todayCount = appointments.filter((a) => a.appointment_date === today).length;
  const overdueAppointments = appointments.filter((a) => isAppointmentOverdue(a, referenceNow));
  const overdueCount = overdueAppointments.length;
  const nextOverdueAppointment = overdueAppointments[0] ?? null;

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count?: number }[] = [
    { key: "agenda", label: "Agenda", icon: CalendarCheck, count: appointments.length },
    { key: "clientes", label: "Clientes", icon: Users, count: clientPlans.length },
    { key: "historico", label: "Histórico", icon: History, count: pastAppointments.length },
  ];

  const selectedAgendaDate = filterDate || today;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderAppointmentCard = (apt: Appointment) => {
    const overdue = isAppointmentOverdue(apt, referenceNow);
    return (
    <motion.div
      key={apt.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border p-4 ${overdue ? "border-destructive/50 ring-1 ring-destructive/20" : "border-border"}`}
    >
      {/* Overdue blinking alert */}
      {overdue && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-destructive/10 animate-pulse">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="font-body text-xs font-semibold text-destructive">
            Horário passou! Confirme se a sessão foi realizada.
          </p>
        </div>
      )}
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
          <div className="flex items-start justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-foreground">{apt.service_title}</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">
                {apt.profile?.full_name || "Cliente"}
              </p>
            </div>
            {apt.profile && partnerId && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setHistoryClient({ userId: apt.user_id, name: apt.profile?.full_name || "Cliente" })}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors border border-border"
                  title="Ficha Completa"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ficha</span>
                </button>
                <button
                  onClick={() => setAnamnesisClient({ userId: apt.user_id, name: apt.profile?.full_name || "Cliente" })}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                  title="Ficha de Anamnese"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Anamnese</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-body text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {apt.appointment_time}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              apt.status === "confirmed" ? "bg-primary/10 text-primary"
                : apt.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            }`}>
              {apt.status === "confirmed" ? "Confirmado" : apt.status === "completed" ? "Concluído" : "Pendente"}
            </span>
            {apt.session_number && apt.total_sessions && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                Sessão {apt.session_number}/{apt.total_sessions}
              </span>
            )}
          </div>

          {/* Session tracker for plan appointments */}
          {apt.plan_id && apt.total_sessions && apt.total_sessions > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Progresso do plano — {apt.completed_sessions || 0}/{apt.total_sessions} sessões
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: apt.total_sessions }, (_, i) => {
                  const sessionNum = i + 1;
                  const sessionApt = apt.planSessions?.find((s) => s.session_number === sessionNum);
                  const isDoneByRecord = sessionApt?.status === "completed";
                  const isDoneByCounter = !sessionApt && sessionNum <= (apt.completed_sessions || 0);
                  const isDone = isDoneByRecord || isDoneByCounter;
                  const isScheduled = sessionApt && sessionApt.status !== "completed";
                  const isCurrent = apt.session_number === sessionNum;

                  return (
                    <div key={sessionNum} className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30"
                          : isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isScheduled
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-muted-foreground/20 bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : sessionNum}
                      </div>
                      {sessionApt && (
                        <span className="font-body text-[8px] text-muted-foreground mt-0.5 text-center leading-tight">
                          {formatDate(sessionApt.date)}
                        </span>
                      )}
                      {isDoneByCounter && !sessionApt && (
                        <span className="font-body text-[8px] text-muted-foreground mt-0.5 text-center leading-tight">
                          Realizada
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-2">
                Restam <span className="font-semibold text-foreground">{(apt.total_sessions || 0) - (apt.completed_sessions || 0)}</span> sessão(ões)
              </p>
            </div>
          )}

          {/* Action buttons for overdue appointments */}
          {overdue && (
            <div className="mt-3 pt-3 border-t border-border flex gap-2 flex-wrap">
              <button
                onClick={() => openDecisionModal(apt, "completed")}
                disabled={completingId === apt.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {completingId === apt.id ? "Salvando..." : "Sessão Realizada"}
              </button>
              <button
                onClick={() => openDecisionModal(apt, "cancelled")}
                disabled={completingId === apt.id}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Não Realizada
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
  };

  return (
    <>
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
            <button onClick={() => setShowDemoRoulette(true)} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors" title="Demo Roleta de Boas-Vindas">
              <Gift className="w-5 h-5" />
            </button>
            <button onClick={() => setShowInstallQR(true)} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors" title="Compartilhar instalação do app">
              <Smartphone className="w-5 h-5" />
            </button>
            <button onClick={() => navigate("/")} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
              <Home className="w-5 h-5" />
            </button>
            <button onClick={signOut} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
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

      <AnimatePresence>
        {nextOverdueAppointment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-xl bg-destructive/10">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-base font-bold text-foreground">Confirmação obrigatória da sessão</p>
                  <p className="font-body text-sm text-muted-foreground mt-1">
                    O horário desta sessão já passou. Marque agora se foi realizada ou não.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                <p className="font-body text-xs text-muted-foreground">Cliente</p>
                <p className="font-heading text-sm font-bold text-foreground">{nextOverdueAppointment.profile?.full_name || "Cliente"}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {nextOverdueAppointment.service_title} • {formatDate(nextOverdueAppointment.appointment_date)} às {nextOverdueAppointment.appointment_time}
                </p>
                {overdueCount > 1 && (
                  <p className="font-body text-[11px] text-destructive font-semibold mt-1">
                    {overdueCount} sessões aguardando confirmação
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveTab("agenda");
                    setFilterDate(nextOverdueAppointment.appointment_date);
                    setExpandedAptId(nextOverdueAppointment.id);
                    openDecisionModal(nextOverdueAppointment, "cancelled");
                  }}
                  className="h-11 rounded-xl border border-destructive/30 text-destructive font-body text-xs font-bold hover:bg-destructive/10 transition-colors"
                >
                  Não realizada
                </button>
                <button
                  onClick={() => {
                    setActiveTab("agenda");
                    setFilterDate(nextOverdueAppointment.appointment_date);
                    setExpandedAptId(nextOverdueAppointment.id);
                    openDecisionModal(nextOverdueAppointment, "completed");
                  }}
                  className="h-11 rounded-xl bg-primary text-primary-foreground font-body text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Sessão realizada
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4">
            <CalendarCheck className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{todayCount}</p>
            <p className="font-body text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <Calendar className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{appointments.length}</p>
            <p className="font-body text-xs text-muted-foreground">Próximos</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="font-heading text-2xl font-bold text-foreground">{clientPlans.length}</p>
            <p className="font-body text-xs text-muted-foreground">Planos Ativos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-body text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "agenda" && (
          <div className="space-y-4">
            {/* Date filter buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              <CalendarPopoverFilter
                date={filterDate ? new Date(filterDate + "T12:00:00") : new Date()}
                onSelect={(d) => {
                  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                  setFilterDate(ds);
                }}
              />
              <button
                onClick={() => setFilterDate(today)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterDate === today ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Hoje
              </button>
              {!permissions.can_create_appointments && (
                <button
                  onClick={() => setFilterDate(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !filterDate ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Todos
                </button>
              )}
            </div>

            {(!filterDate && appointments.length === 0) ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-muted-foreground">Nenhum agendamento próximo.</p>
              </div>
            ) : filterDate ? (
              <DayTimelineView
                appointments={appointments.filter((a) => a.appointment_date === filterDate).map((a) => ({
                  ...a,
                  service_slug: a.service_slug || "",
                  total_sessions: a.total_sessions || null,
                  completed_sessions: a.completed_sessions || null,
                  planSessions: a.planSessions || [],
                  profiles: a.profile ? { ...a.profile, phone: (a.profile as any).phone || "", email: null } : null,
                }))}
                expandedAptId={expandedAptId}
                onSelectAppointment={(id) => setExpandedAptId(expandedAptId === id ? null : id)}
                clientPlans={clientPlans.map(p => ({
                  id: p.id,
                  user_id: p.user_id,
                  service_slug: p.service_slug,
                  service_title: p.service_title,
                  plan_name: p.plan_name,
                  total_sessions: p.total_sessions,
                  completed_sessions: p.completed_sessions,
                  status: p.status,
                }))}
                isRescheduled={(apt) => {
                  if (!apt.notes) return false;
                  try { return !!JSON.parse(apt.notes).rescheduled; } catch { return false; }
                }}
                onAnamnesis={partnerId ? (userId, name) => setAnamnesisClient({ userId, name }) : undefined}
                onHistory={(userId, name) => setHistoryClient({ userId, name })}
                onScheduleSession={(params) => setScheduleModal(params)}
                onComplete={(apt) => {
                  const fullApt = appointments.find(a => a.id === apt.id);
                  if (fullApt) openDecisionModal(fullApt, "completed");
                }}
                onMarkNoShow={(apt) => {
                  const fullApt = appointments.find(a => a.id === apt.id);
                  if (fullApt) openDecisionModal(fullApt, "cancelled");
                }}
                markingAppointmentId={completingId}
                isOverdue={(apt) => {
                  const fullApt = appointments.find(a => a.id === apt.id);
                  return fullApt ? isAppointmentOverdue(fullApt, referenceNow) : false;
                }}
                {...(permissions.can_reschedule ? {
                  onDragReschedule: handleDragReschedule,
                  onReschedule: (apt: any) => {
                    const fullApt = appointments.find(a => a.id === apt.id);
                    if (fullApt) {
                      setScheduleModal({
                        planId: fullApt.plan_id || "",
                        sessionNumber: fullApt.session_number || 1,
                        serviceSlug: fullApt.service_slug,
                        serviceTitle: fullApt.service_title,
                        userId: fullApt.user_id,
                        partnerId: (fullApt as any).partner_id || partnerId,
                      });
                    }
                  },
                } : {})}
                {...(permissions.can_cancel ? { onCancel: handleCancelAppointment } : {})}
                {...(permissions.can_create_appointments ? {
                  onSlotClick: (time: string) => {
                    setQuickBook({ time });
                    setQbUserId("");
                    setQbServiceSlug("");
                    setQbShowNewClient(false);
                  },
                } : {})}
              />
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
                    {apts.map(renderAppointmentCard)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="space-y-3">
            {clientPlans.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-muted-foreground">Nenhum plano de tratamento em andamento.</p>
              </div>
            ) : (
              clientPlans.map((plan) => {
                const progress = plan.total_sessions > 0
                  ? Math.round((plan.completed_sessions / plan.total_sessions) * 100)
                  : 0;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {plan.profile?.avatar_url ? (
                          <img src={plan.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-heading text-xs font-bold text-primary">
                            {plan.profile ? getInitials(plan.profile.full_name) : "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-heading text-sm font-bold text-foreground">{plan.profile?.full_name || "Cliente"}</p>
                            <p className="font-body text-xs text-muted-foreground mt-0.5">{plan.service_title} · {plan.plan_name}</p>
                          </div>
                          {plan.profile && partnerId && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setHistoryClient({ userId: plan.user_id, name: plan.profile?.full_name || "Cliente" })}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors border border-border"
                                title="Ficha Completa"
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ficha</span>
                              </button>
                              <button
                                onClick={() => setAnamnesisClient({ userId: plan.user_id, name: plan.profile?.full_name || "Cliente" })}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                                title="Ficha de Anamnese"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Anamnese</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-body text-[10px] text-muted-foreground">
                              {plan.completed_sessions}/{plan.total_sessions} sessões
                            </span>
                            <span className="font-body text-[10px] font-semibold text-primary">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Next appointment */}
                        {plan.nextAppointment ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-muted-foreground">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span>Próxima: <span className="font-semibold text-foreground">{formatDate(plan.nextAppointment.date)}</span> às {plan.nextAppointment.time}</span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-body text-amber-600">
                            <Calendar className="w-3 h-3" />
                            <span>Sem agendamento próximo</span>
                          </div>
                        )}

                          {/* Session details */}
                          {plan.scheduledSessions && plan.scheduledSessions.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sessões agendadas:</p>
                              {plan.scheduledSessions.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-body">
                                  {s.status === "completed" ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  )}
                                  <span className={s.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}>
                                    Sessão {s.session_number} — {formatDate(s.date)} às {s.time}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    s.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                      : s.status === "confirmed" ? "bg-primary/10 text-primary"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                  }`}>
                                    {s.status === "completed" ? "Feita" : s.status === "confirmed" ? "Confirmada" : "Pendente"}
                                  </span>
                                </div>
                              ))}
                              <p className="font-body text-[10px] text-muted-foreground mt-1">
                                Restam <span className="font-semibold text-foreground">{plan.total_sessions - plan.completed_sessions}</span> sessão(ões)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "historico" && (
          <div className="space-y-6">
            {pastAppointments.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-muted-foreground">Nenhum atendimento anterior encontrado.</p>
              </div>
            ) : (
              Object.entries(pastGrouped).map(([date, apts]) => (
                <div key={date}>
                  <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {formatDate(date)}
                  </h3>
                  <div className="space-y-3">
                    {apts.map((apt) => (
                      <motion.div
                        key={apt.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-2xl border border-border p-4 opacity-80"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {apt.profile?.avatar_url ? (
                              <img src={apt.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-heading text-xs font-bold text-muted-foreground">
                                {apt.profile ? getInitials(apt.profile.full_name) : "?"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-heading text-sm font-bold text-foreground">{apt.service_title}</p>
                            <p className="font-body text-xs text-muted-foreground mt-0.5">{apt.profile?.full_name || "Cliente"}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs font-body text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {apt.appointment_time}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Realizado
                              </span>
                              {apt.session_number && apt.total_sessions && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground">
                                  Sessão {apt.session_number}/{apt.total_sessions}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
    {anamnesisClient && partnerId && (
      <AnamnesisModal
        open={!!anamnesisClient}
        onClose={() => setAnamnesisClient(null)}
        clientUserId={anamnesisClient.userId}
        clientName={anamnesisClient.name}
        partnerId={partnerId}
      />
    )}
    {historyClient && (
      <UserHistoryModal
        open={!!historyClient}
        onClose={() => setHistoryClient(null)}
        userId={historyClient.userId}
        userName={historyClient.name}
      />
    )}

    {scheduleModal && (
      <SessionScheduleModal
        open={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
        onScheduled={() => { setScheduleModal(null); window.location.reload(); }}
        planId={scheduleModal.planId}
        sessionNumber={scheduleModal.sessionNumber}
        serviceSlug={scheduleModal.serviceSlug}
        serviceTitle={scheduleModal.serviceTitle}
        userId={scheduleModal.userId}
        partnerId={scheduleModal.partnerId || partnerId}
      />
    )}

    {/* Install QR Code Modal */}
    <AnimatePresence>
      {showInstallQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowInstallQR(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl text-center space-y-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Instalar o App
              </h3>
              <button onClick={() => setShowInstallQR(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <p className="font-body text-sm text-muted-foreground">
              Mostre este QR Code para seus clientes instalarem o app no celular.
            </p>

            <div className="bg-white rounded-2xl p-4 inline-block mx-auto">
              <img src={qrCodeUrl} alt="QR Code para instalar o app" className="w-56 h-56" />
            </div>

            <div className="space-y-2">
              <p className="font-body text-xs text-muted-foreground font-semibold">📱 iPhone (iOS)</p>
              <p className="font-body text-xs text-muted-foreground">Abrir no Safari → Compartilhar → "Adicionar à Tela de Início"</p>
              <p className="font-body text-xs text-muted-foreground font-semibold mt-2">🤖 Android</p>
              <p className="font-body text-xs text-muted-foreground">Abrir no Chrome → Menu (⋮) → "Instalar aplicativo"</p>
            </div>

            <button
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: "Instalar App Rosa de Lis", url: installUrl });
                  } catch {}
                } else {
                  await navigator.clipboard.writeText(installUrl);
                  alert("Link copiado!");
                }
              }}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar Link
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Quick Book Modal */}
    <AnimatePresence>
      {quickBook && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
          onClick={() => setQuickBook(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
              {filterDate ? formatDate(filterDate) : ""}
            </p>

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
                    setAllProfiles((prev) => [{ user_id: client.user_id, full_name: client.full_name }, ...prev]);
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
                const { data, error } = await supabase
                  .from("appointments")
                  .insert({
                    user_id: qbUserId,
                    service_slug: qbServiceSlug,
                    service_title: service?.title || qbServiceSlug,
                    appointment_date: filterDate,
                    appointment_time: quickBook.time,
                    status: "confirmed",
                    partner_id: partnerId,
                  })
                  .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, notes")
                  .single();
                setQbSaving(false);

                if (error) {
                  toast.error("Erro ao agendar: " + error.message);
                  return;
                }

                const selectedProfile = allProfiles.find((p) => p.user_id === qbUserId);
                const createdApt: Appointment = {
                  ...(data as any),
                  plan_id: (data as any)?.plan_id ?? null,
                  session_number: (data as any)?.session_number ?? null,
                  notes: (data as any)?.notes ?? null,
                  profile: selectedProfile ? { full_name: selectedProfile.full_name, avatar_url: null } : null,
                  total_sessions: null,
                  completed_sessions: null,
                  planSessions: [],
                };

                setAppointments((prev) =>
                  [...prev, createdApt].sort((a, b) =>
                    `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`)
                  )
                );
                toast.success("Agendamento criado ✅");
                setQuickBook(null);
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {qbSaving ? "Agendando..." : "Confirmar Agendamento"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Demo Roulette */}
    {showDemoRoulette && (
      <WelcomeRoulette testMode onClose={() => setShowDemoRoulette(false)} />
    )}

    {/* Drag Reschedule Confirmation */}
    <AnimatePresence>
      {dragConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDragConfirm(null); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
          >
            <h3 className="font-heading text-base font-bold text-foreground">Confirmar remarcação</h3>
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="font-heading text-sm font-bold text-foreground">
                {dragConfirm.apt.profile?.full_name || "Cliente"}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {dragConfirm.apt.service_title}
              </p>
              <p className="font-body text-sm text-foreground">
                {dragConfirm.apt.appointment_time} → <span className="font-bold text-primary">{dragConfirm.newTime}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDragConfirm(null)}
                className="h-10 rounded-xl border border-border font-body text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDragReschedule}
                className="h-10 rounded-xl bg-primary text-primary-foreground font-body text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Decision Modal — Sessão Realizada / Não Realizada */}
    <AnimatePresence>
      {decisionModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDecisionModal(null); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-foreground">
                {decisionModal.type === "completed" ? "✅ Sessão Realizada" : "❌ Sessão Não Realizada"}
              </h3>
              <button onClick={() => setDecisionModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-0.5">
              <p className="font-heading text-sm font-bold text-foreground">
                {decisionModal.apt.profile?.full_name || "Cliente"}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {decisionModal.apt.service_title} • {formatDate(decisionModal.apt.appointment_date)} às {decisionModal.apt.appointment_time}
              </p>
            </div>

            {decisionModal.type === "completed" ? (
              <div className="space-y-2">
                <label className="font-body text-xs font-semibold text-foreground">
                  Observação do atendimento <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Ex: Pele sensível, aplicar hidratação extra na próxima..."
                  maxLength={500}
                  className="w-full min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="font-body text-xs font-semibold text-foreground">
                  Motivo do cancelamento <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancel-reason"
                      checked={cancelReason === "no_show"}
                      onChange={() => setCancelReason("no_show")}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-body text-sm text-foreground">Cliente não apareceu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cancel-reason"
                      checked={cancelReason === "other"}
                      onChange={() => setCancelReason("other")}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-body text-sm text-foreground">Outro motivo</span>
                  </label>
                </div>
                {cancelReason === "other" && (
                  <textarea
                    value={cancelReasonText}
                    onChange={(e) => setCancelReasonText(e.target.value)}
                    placeholder="Descreva o motivo..."
                    maxLength={500}
                    className="w-full min-h-[70px] rounded-xl border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setDecisionModal(null)}
                className="h-11 rounded-xl border border-border font-body text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDecision}
                disabled={completingId === decisionModal.apt.id}
                className={`h-11 rounded-xl font-body text-sm font-bold transition-all disabled:opacity-50 ${
                  decisionModal.type === "completed"
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-destructive text-destructive-foreground hover:opacity-90"
                }`}
              >
                {completingId === decisionModal.apt.id ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default PartnerDashboard;
