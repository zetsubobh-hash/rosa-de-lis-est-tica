import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Clock, CalendarCheck, CalendarClock, CalendarIcon,
  Users, History, ClipboardList, CheckCircle2, Home, LogOut, FileText, Smartphone, Share2, X, Search, Gift
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import CalendarPopoverFilter from "@/components/admin/CalendarPopoverFilter";
import AnamnesisModal from "@/components/AnamnesisModal";
import UserHistoryModal from "@/components/admin/UserHistoryModal";
import SessionScheduleModal from "@/components/SessionScheduleModal";
import DayTimelineView from "@/components/admin/DayTimelineView";
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
  service_slug?: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  user_id: string;
  notes: string | null;
  plan_id: string | null;
  session_number: number | null;
  total_sessions?: number | null;
  completed_sessions?: number | null;
  planSessions?: SessionInfo[];
  profile?: { full_name: string; avatar_url: string | null } | null;
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

const isRescheduled = (apt: Appointment): boolean => {
  if (!apt.notes) return false;
  try {
    const noteData = JSON.parse(apt.notes);
    return !!noteData.rescheduled;
  } catch { return false; }
};

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
  const [h, m] = apt.appointment_time.split(":").map(Number);
  const aptMinutes = h * 60 + m + 30;
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  return nowMinutes >= aptMinutes;
};

const AdminPartnerView = () => {
  const { logoWhite: logo } = useBrandingLogos();
  const [partners, setPartners] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [anamnesisClient, setAnamnesisClient] = useState<{ userId: string; name: string } | null>(null);
  const [historyClient, setHistoryClient] = useState<{ userId: string; name: string } | null>(null);
  const [showInstallQR, setShowInstallQR] = useState(false);
  const [showDemoRoulette, setShowDemoRoulette] = useState(false);
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [expandedAptId, setExpandedAptId] = useState<string | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{
    planId: string; sessionNumber: number; serviceSlug: string; serviceTitle: string; userId: string; partnerId?: string | null;
  } | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ apt: Appointment; type: "completed" | "cancelled" } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [cancelReason, setCancelReason] = useState<"no_show" | "other">("no_show");
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [clientSearchName, setClientSearchName] = useState("");
  const [clientSearchService, setClientSearchService] = useState("");
  const installUrl = typeof window !== "undefined" ? `${window.location.origin}/instalar` : "/instalar";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(installUrl)}`;

  const filteredClientPlans = clientPlans.filter((plan) => {
    const nameMatch = !clientSearchName || (plan.profile?.full_name || "").toLowerCase().includes(clientSearchName.toLowerCase());
    const serviceMatch = !clientSearchService || (plan.service_title || "").toLowerCase().includes(clientSearchService.toLowerCase());
    return nameMatch && serviceMatch;
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      setPartners(data || []);
      setSelectedPartner(data && data.length > 0 ? data[0].id : "");
      setLoading(false);
    };
    fetchPartners();
  }, []);

  const fetchData = async (partnerId: string) => {
    setDataLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const [{ data: upcoming }, { data: past }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, partner_id, notes")
        .eq("partner_id", partnerId)
        .gte("appointment_date", today)
        .in("status", ["confirmed", "pending", "completed"])
        .order("appointment_date")
        .order("appointment_time"),
      supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, partner_id, notes")
        .eq("partner_id", partnerId)
        .in("status", ["completed", "confirmed"])
        .lt("appointment_date", today)
        .order("appointment_date", { ascending: false })
        .order("appointment_time", { ascending: false })
        .limit(50),
    ]);

    const allApts = [...(upcoming || []), ...(past || [])];
    const userIds = [...new Set(allApts.map((a) => a.user_id))];
    const planIds = [...new Set(allApts.filter((a) => a.plan_id).map((a) => a.plan_id!))];

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

    const planMap: Record<string, any> = {};
    planByIdResult?.data?.forEach((p: any) => { planMap[p.id] = p; });
    clientPlansResult?.data?.forEach((p: any) => { if (!planMap[p.id]) planMap[p.id] = p; });

    const userServicePlanMap: Record<string, any> = {};
    clientPlansResult?.data?.forEach((p: any) => {
      const key = `${p.user_id}::${p.service_slug}`;
      if (!userServicePlanMap[key]) userServicePlanMap[key] = p;
    });

    const allPlanIds = [...new Set([
      ...planIds,
      ...(clientPlansResult?.data?.map((p: any) => p.id) || []),
    ])];

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
    } else {
      setClientPlans([]);
    }

    setDataLoading(false);
  };

  useEffect(() => {
    if (!selectedPartner) return;
    fetchData(selectedPartner);
  }, [selectedPartner]);

  // Realtime: refetch when appointments change via postgres_changes
  useEffect(() => {
    if (!selectedPartner) return;

    const channel = supabase
      .channel("partner-view-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          fetchData(selectedPartner);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedPartner]);

  // Instant sync: listen for broadcast from AdminAgenda when partner is assigned/unassigned
  useEffect(() => {
    if (!selectedPartner) return;

    const channel = supabase
      .channel("partner-assign-sync")
      .on("broadcast", { event: "partner-changed" }, () => {
        fetchData(selectedPartner);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedPartner]);

  const openDecisionModal = (apt: Appointment, type: "completed" | "cancelled") => {
    setDecisionModal({ apt, type });
    setDecisionNotes("");
    setCancelReason("no_show");
    setCancelReasonText("");
  };

  const handleConfirmDecision = async () => {
    if (!decisionModal) return;

    const { apt, type } = decisionModal;
    const completed = type === "completed";

    if (!completed && cancelReason === "other" && !cancelReasonText.trim()) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }

    setCompletingId(apt.id);
    try {
      const newStatus = completed ? "completed" : "cancelled";

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
            }),
      };

      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ status: newStatus, notes: JSON.stringify(notesPayload) })
        .eq("id", apt.id);

      if (appointmentError) throw appointmentError;

      if (completed && apt.plan_id) {
        const plan = clientPlans.find((p) => p.id === apt.plan_id);
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

          setClientPlans((prev) =>
            prev.map((p) => (p.id === plan.id ? { ...p, completed_sessions: newCompleted, status: newPlanStatus } : p))
          );
        }
      }

      setAppointments((prev) => prev.map((a) => a.id === apt.id ? { ...a, status: completed ? "completed" : "cancelled", notes: JSON.stringify(notesPayload) } : a));
      if (completed) {
        setPastAppointments((prev) => [{ ...apt, status: "completed", notes: JSON.stringify(notesPayload) }, ...prev]);
      }

      toast.success(completed ? "✅ Sessão marcada como realizada!" : "❌ Sessão marcada como não realizada.");
      setDecisionModal(null);
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setCompletingId(null);
    }
  };


  const pastGrouped = pastAppointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const today = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.appointment_date === today).length;
  const selectedPartnerName = partners.find((p) => p.id === selectedPartner)?.full_name || "";

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count?: number }[] = [
    { key: "agenda", label: "Agenda", icon: CalendarCheck, count: appointments.length },
    { key: "clientes", label: "Clientes", icon: Users, count: clientPlans.length },
    { key: "historico", label: "Histórico", icon: History, count: pastAppointments.length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-body text-muted-foreground">Nenhum parceiro ativo cadastrado.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Partner selector - admin only */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="font-body text-sm text-muted-foreground">Visualizar como:</label>
        <select
          value={selectedPartner}
          onChange={(e) => { setSelectedPartner(e.target.value); setActiveTab("agenda"); }}
          className="h-9 rounded-xl border border-border bg-card px-3 font-body text-sm text-foreground font-semibold"
        >
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name}</option>
          ))}
        </select>
      </div>

      {dataLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        /* Simulated partner dashboard - faithful replica */
        <div className="rounded-2xl border border-border overflow-hidden bg-background">
          {/* Partner header - replica of /parceiro */}
          <header className="bg-gradient-to-r from-primary to-[hsl(var(--pink-dark))] px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Rosa de Lis" className="h-10 w-auto" />
                <div>
                  <p className="font-body text-xs text-primary-foreground/60 uppercase tracking-widest font-semibold">Painel do Parceiro</p>
                  <p className="font-heading text-sm font-bold text-primary-foreground">{selectedPartnerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowInstallQR(true)} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors" title="Compartilhar instalação do app">
                  <Smartphone className="w-5 h-5" />
                </button>
                <button onClick={() => setShowDemoRoulette(true)} className="p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors" title="Demo Roleta de Boas-Vindas">
                  <Gift className="w-5 h-5" />
                </button>
                <div className="p-2 rounded-lg text-primary-foreground/30 cursor-default">
                  <Home className="w-5 h-5" />
                </div>
                <div className="p-2 rounded-lg text-primary-foreground/30 cursor-default">
                  <LogOut className="w-5 h-5" />
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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

            {/* Agenda tab */}
            {activeTab === "agenda" && (
              <div className="space-y-4">
                {/* Date filter with calendar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterDate(new Date())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body border transition-all ${
                      format(filterDate, "yyyy-MM-dd") === today
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    Hoje
                  </button>
                  <CalendarPopoverFilter date={filterDate} onSelect={setFilterDate} align="start" />
                </div>

                {(() => {
                  const dateStr = format(filterDate, "yyyy-MM-dd");
                  const dayApts = appointments.filter((a) => a.appointment_date === dateStr);
                  return (
                    <DayTimelineView
                      appointments={dayApts.map((a) => ({
                        ...a,
                        service_slug: a.service_slug || "",
                        partner_id: null,
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
                      onAnamnesis={(userId, name) => setAnamnesisClient({ userId, name })}
                      onHistory={(userId, name) => setHistoryClient({ userId, name })}
                      onScheduleSession={undefined}
                      onComplete={(apt) => {
                        const fullApt = appointments.find((a) => a.id === apt.id);
                        if (fullApt) openDecisionModal(fullApt, "completed");
                      }}
                      onMarkNoShow={(apt) => {
                        const fullApt = appointments.find((a) => a.id === apt.id);
                        if (fullApt) openDecisionModal(fullApt, "cancelled");
                      }}
                      markingAppointmentId={completingId}
                      isOverdue={(apt) => {
                        const fullApt = appointments.find(a => a.id === apt.id);
                        return fullApt ? isAppointmentOverdue(fullApt, new Date(nowTick)) : false;
                      }}
                    />
                  );
                })()}
              </div>
            )}

            {/* Clientes tab */}
            {activeTab === "clientes" && (
              <div className="space-y-3">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      value={clientSearchName}
                      onChange={(e) => setClientSearchName(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por procedimento..."
                      value={clientSearchService}
                      onChange={(e) => setClientSearchService(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                {filteredClientPlans.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-body text-muted-foreground">
                      {clientPlans.length === 0 ? "Nenhum plano de tratamento em andamento." : "Nenhum resultado encontrado."}
                    </p>
                  </div>
                ) : (
                  filteredClientPlans.map((plan) => {
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
                              {plan.profile && (
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

                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-body text-[10px] text-muted-foreground">
                                  {plan.completed_sessions}/{plan.total_sessions} sessões
                                </span>
                                <span className="font-body text-[10px] font-semibold text-primary">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            </div>

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

            {/* Histórico tab */}
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
          </div>
        </div>
      )}
      {anamnesisClient && (
        <AnamnesisModal
          open={!!anamnesisClient}
          onClose={() => setAnamnesisClient(null)}
          clientUserId={anamnesisClient.userId}
          clientName={anamnesisClient.name}
          partnerId={selectedPartner}
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
          onScheduled={() => { fetchData(selectedPartner); setScheduleModal(null); }}
          planId={scheduleModal.planId}
          sessionNumber={scheduleModal.sessionNumber}
          serviceSlug={scheduleModal.serviceSlug}
          serviceTitle={scheduleModal.serviceTitle}
          userId={scheduleModal.userId}
          partnerId={scheduleModal.partnerId || selectedPartner}
        />
      )}

      <AnimatePresence>
        {decisionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm p-4 flex items-center justify-center"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setDecisionModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4"
              onMouseDown={(e) => e.stopPropagation()}
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
                    onChange={(e) => setDecisionNotes(e.target.value.slice(0, 500))}
                    placeholder="Ex: Atendimento com boa resposta ao procedimento..."
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
                        name="cancel-reason-admin-partner"
                        checked={cancelReason === "no_show"}
                        onChange={() => setCancelReason("no_show")}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="font-body text-sm text-foreground">Cliente não apareceu</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cancel-reason-admin-partner"
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
                      onChange={(e) => setCancelReasonText(e.target.value.slice(0, 500))}
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

      <AnimatePresence>
        {showInstallQR && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowInstallQR(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm p-6 space-y-4"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Instalar o App
                </h3>
                <button onClick={() => setShowInstallQR(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                Compartilhe este QR Code com seus clientes para que instalem o app no celular.
              </p>
              <div className="flex justify-center">
                <img src={qrCodeUrl} alt="QR Code de instalação" className="w-48 h-48 rounded-xl border border-border" />
              </div>
              <div className="space-y-2">
                <p className="font-body text-[11px] text-muted-foreground text-center">
                  <strong>iPhone:</strong> Abrir no Safari → Compartilhar → Tela de Início
                </p>
                <p className="font-body text-[11px] text-muted-foreground text-center">
                  <strong>Android:</strong> Abrir no Chrome → "Instalar aplicativo"
                </p>
              </div>
              <button
                onClick={async () => {
                  if (navigator.share) {
                    try { await navigator.share({ title: "Instalar App Rosa de Lis", url: installUrl }); } catch {}
                  } else {
                    await navigator.clipboard.writeText(installUrl);
                    alert("Link copiado!");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPartnerView;
