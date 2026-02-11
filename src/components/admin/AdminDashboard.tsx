import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, CalendarCheck, TrendingUp, Eye, Wifi } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface PageView {
  path: string;
  created_at: string;
}

interface AppointmentStat {
  service_title: string;
  status: string;
  created_at: string;
}

const CHART_COLORS = [
  "hsl(340, 80%, 55%)",
  "hsl(340, 60%, 70%)",
  "hsl(38, 60%, 55%)",
  "hsl(340, 40%, 45%)",
  "hsl(200, 60%, 55%)",
  "hsl(160, 50%, 50%)",
];

const AdminDashboard = () => {
  const [views, setViews] = useState<PageView[]>([]);
  const [appointments, setAppointments] = useState<AppointmentStat[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "14" | "30">("7");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const daysAgo = subDays(new Date(), parseInt(period));

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [viewsRes, appointmentsRes, usersRes, onlineRes] = await Promise.all([
        supabase
          .from("page_views")
          .select("path, created_at")
          .gte("created_at", daysAgo.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("appointments")
          .select("service_title, status, created_at")
          .gte("created_at", daysAgo.toISOString()),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("last_seen", fiveMinAgo),
      ]);

      setViews(viewsRes.data || []);
      setAppointments(appointmentsRes.data || []);
      setTotalUsers(usersRes.count || 0);
      setOnlineCount(onlineRes.count || 0);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  // Daily visits chart data
  const dailyVisits = useMemo(() => {
    const days = parseInt(period);
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    });

    return interval.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const count = views.filter((v) => v.created_at.startsWith(dayStr)).length;
      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        visitas: count,
      };
    });
  }, [views, period]);

  // Top pages
  const topPages = useMemo(() => {
    const counts: Record<string, number> = {};
    views.forEach((v) => {
      const name = v.path === "/" ? "Página Inicial" : v.path.replace("/servico/", "Serviço: ").replace("/agendar/", "Agendar: ");
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [views]);

  // Services pie chart
  const serviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a) => {
      counts[a.service_title] = (counts[a.service_title] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const todayViews = views.filter((v) => v.created_at.startsWith(format(new Date(), "yyyy-MM-dd"))).length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[
          { value: "7" as const, label: "7 dias" },
          { value: "14" as const, label: "14 dias" },
          { value: "30" as const, label: "30 dias" },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl font-body text-xs font-semibold transition-all ${
              period === p.value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border hover:border-primary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Eye, label: "Visitas Hoje", value: todayViews, color: "text-primary" },
          { icon: BarChart3, label: `Total (${period}d)`, value: views.length, color: "text-primary" },
          { icon: CalendarCheck, label: "Confirmados", value: confirmedCount, color: "text-primary" },
          { icon: Users, label: "Clientes", value: totalUsers, color: "text-gold" },
          { icon: Wifi, label: "Online Agora", value: onlineCount, color: "text-emerald-500" },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
            <p className="font-heading text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="font-body text-xs text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Visits Chart */}
      <div className="bg-card rounded-3xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Visitas por Dia</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyVisits}>
              <defs>
                <linearGradient id="visitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(340, 80%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(340, 80%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(340, 15%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(340, 10%, 45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(340, 10%, 45%)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(340, 15%, 90%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="visitas" stroke="hsl(340, 80%, 55%)" fill="url(#visitGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two columns: Top Pages + Services */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-heading text-sm font-bold text-foreground mb-4">Páginas Mais Visitadas</h3>
          {topPages.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPages} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(340, 10%, 45%)" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(340, 10%, 45%)" }} width={100} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(340, 15%, 90%)", borderRadius: "12px", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="hsl(340, 80%, 55%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Services breakdown */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <h3 className="font-heading text-sm font-bold text-foreground mb-4">Serviços Agendados</h3>
          {serviceBreakdown.length === 0 ? (
            <p className="font-body text-xs text-muted-foreground">Sem agendamentos no período.</p>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {serviceBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(340, 15%, 90%)", borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {serviceBreakdown.length > 0 && (
            <div className="mt-2 space-y-1">
              {serviceBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="font-body text-xs text-muted-foreground truncate flex-1">{s.name}</span>
                  <span className="font-body text-xs font-bold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 flex items-center gap-3">
          <CalendarCheck className="w-5 h-5 text-gold flex-shrink-0" />
          <p className="font-body text-sm text-foreground">
            <strong>{pendingCount}</strong> agendamento(s) pendente(s) aguardando confirmação de pagamento.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
