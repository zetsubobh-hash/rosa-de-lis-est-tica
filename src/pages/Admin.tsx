import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, BarChart3, CalendarCheck, CreditCard, LogOut, Home, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-branca.png";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAgenda from "@/components/admin/AdminAgenda";
import AdminPaymentSettings from "@/components/admin/AdminPaymentSettings";
import AdminBranding from "@/components/admin/AdminBranding";

type Tab = "dashboard" | "agenda" | "payments" | "branding";

const Admin = () => {
  const { user, signOut } = useAuth();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "agenda", label: "Agenda", icon: CalendarCheck },
    { key: "payments", label: "Pagamento", icon: CreditCard },
    { key: "branding", label: "Identidade Visual", icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-primary via-primary to-[hsl(var(--pink-dark))] flex flex-col z-50">
        {/* Logo */}
        <div className="px-6 py-6 flex items-center gap-3">
          <img src={logo} alt="Rosa de Lis" className="h-10 w-auto" />
        </div>

        {/* Admin badge */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10">
            <Shield className="w-4 h-4 text-primary-foreground/70" />
            <span className="font-body text-xs text-primary-foreground/70 uppercase tracking-widest font-semibold">Painel Admin</span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-primary-foreground/20 text-primary-foreground shadow-sm"
                  : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-6 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            Voltar ao Site
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-8 py-4">
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-heading text-xl font-bold text-foreground"
          >
            {tabs.find((t) => t.key === activeTab)?.label}
          </motion.h1>
        </div>

        <div className="p-8">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "agenda" && <AdminAgenda />}
          {activeTab === "payments" && <AdminPaymentSettings initialSettings={settingsMap} />}
          {activeTab === "branding" && <AdminBranding />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
