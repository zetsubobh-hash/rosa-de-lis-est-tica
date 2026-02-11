import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Clock, Bell, LogOut, Home, CalendarCheck,
  Users, History, ClipboardList, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo-branca.png";

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

const PartnerDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [newNotifications, setNewNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }

    const init = async () => {
      const { data: partner } = await supabase
        .from("partners")
        .select("id, full_name")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!partner) {
        navigate("/", { replace: true });
        return;
      }

      setPartnerId(partner.id);
      setPartnerName(partner.full_name);

      const today = new Date().toISOString().split("T")[0];

      // Fetch upcoming and past appointments in parallel
      const [{ data: upcoming }, { data: past }] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number")
          .eq("partner_id", partner.id)
          .gte("appointment_date", today)
          .in("status", ["confirmed", "pending"])
          .order("appointment_date")
          .order("appointment_time"),
        supabase
          .from("appointments")
          .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number")
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
          ? supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
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

  const today = new Date().toISOString().split("T")[0];
  const todayCount = appointments.filter((a) => a.appointment_date === today).length;

  const tabs: { key: Tab; label: string; icon: typeof Calendar; count?: number }[] = [
    { key: "agenda", label: "Agenda", icon: CalendarCheck, count: appointments.length },
    { key: "clientes", label: "Clientes", icon: Users, count: clientPlans.length },
    { key: "historico", label: "Histórico", icon: History, count: pastAppointments.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderAppointmentCard = (apt: Appointment) => (
    <motion.div
      key={apt.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
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
          <p className="font-heading text-sm font-bold text-foreground">{apt.service_title}</p>
          <p className="font-body text-xs text-muted-foreground mt-0.5">
            {apt.profile?.full_name || "Cliente"}
          </p>
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
        </div>
      </div>
    </motion.div>
  );

  return (
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
          <div className="space-y-6">
            {appointments.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-body text-muted-foreground">Nenhum agendamento próximo.</p>
              </div>
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
                        <p className="font-heading text-sm font-bold text-foreground">{plan.profile?.full_name || "Cliente"}</p>
                        <p className="font-body text-xs text-muted-foreground mt-0.5">{plan.service_title} · {plan.plan_name}</p>

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
  );
};

export default PartnerDashboard;
