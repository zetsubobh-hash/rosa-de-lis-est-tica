import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, BarChart3, CalendarCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAgenda from "@/components/admin/AdminAgenda";
import AdminPaymentSettings from "@/components/admin/AdminPaymentSettings";

type Tab = "dashboard" | "agenda" | "payments";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("payment_settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => { map[row.key] = row.value; });
        setSettingsMap(map);
      }
      setLoading(false);
    };
    if (isAdmin) fetchSettings();
  }, [isAdmin]);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "agenda", label: "Agenda", icon: CalendarCheck },
    { key: "payments", label: "Pagamento", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-1">Painel</p>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">Administração</h1>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <div className="flex gap-1 bg-muted rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl font-body text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === "dashboard" && <AdminDashboard />}
        {activeTab === "agenda" && <AdminAgenda />}
        {activeTab === "payments" && <AdminPaymentSettings initialSettings={settingsMap} />}
      </div>

      <Footer />
    </div>
  );
};

export default Admin;
