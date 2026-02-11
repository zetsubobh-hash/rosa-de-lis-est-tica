import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, BarChart3, CalendarCheck, CreditCard, LogOut, Home, Palette, DollarSign, Menu, X, Users, Briefcase, Handshake, Eye, MessageCircle, Layers, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-branca.png";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAgenda from "@/components/admin/AdminAgenda";
import AdminPaymentSettings from "@/components/admin/AdminPaymentSettings";
import AdminBranding from "@/components/admin/AdminBranding";
import AdminPricing from "@/components/admin/AdminPricing";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminServices from "@/components/admin/AdminServices";
import AdminPartners from "@/components/admin/AdminPartners";
import AdminPartnerView from "@/components/admin/AdminPartnerView";
import AdminWhatsApp from "@/components/admin/AdminWhatsApp";
import AdminClientPlans from "@/components/admin/AdminClientPlans";
import AdminHistory from "@/components/admin/AdminHistory";

type Tab = "dashboard" | "agenda" | "services" | "pricing" | "payments" | "branding" | "users" | "partners" | "partner-view" | "whatsapp" | "client-plans" | "history";

const Admin = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!roleLoading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      const [settingsRes, profileRes] = await Promise.all([
        supabase.from("payment_settings").select("key, value"),
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user!.id).maybeSingle(),
      ]);
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        settingsRes.data.forEach((row: any) => { map[row.key] = row.value; });
        setSettingsMap(map);
      }
      if (profileRes.data) {
        setAdminName(profileRes.data.full_name);
        setAdminAvatar(profileRes.data.avatar_url || null);
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
    { key: "services", label: "Serviços", icon: Briefcase },
    { key: "pricing", label: "Preços", icon: DollarSign },
    { key: "payments", label: "Pagamento", icon: CreditCard },
    { key: "branding", label: "Identidade Visual", icon: Palette },
    { key: "partners", label: "Parceiros", icon: Handshake },
    { key: "partner-view", label: "Visão Parceiro", icon: Eye },
    { key: "client-plans", label: "Planos Clientes", icon: Layers },
    { key: "history", label: "Finalizados", icon: History },
    { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { key: "users", label: "Usuários", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-[hsl(var(--pink-dark))] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Rosa de Lis" className="h-8 w-auto" />
          {adminName && (
            <span className="font-body text-xs text-primary-foreground font-semibold truncate max-w-[140px]">{adminName}</span>
          )}
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <motion.aside
        initial={false}
        animate={{ x: mobileMenuOpen ? 0 : -280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="md:hidden fixed top-0 left-0 h-full w-[280px] bg-gradient-to-b from-primary via-primary to-[hsl(var(--pink-dark))] flex flex-col z-50 pt-16"
      >
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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
      </motion.aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-primary via-primary to-[hsl(var(--pink-dark))] flex-col z-50">
        <div className="px-6 py-6 flex items-center gap-3">
          <img src={logo} alt="Rosa de Lis" className="h-10 w-auto" />
        </div>
        {adminName && (
          <div className="px-6 mb-3 flex items-center gap-2.5">
            {adminAvatar ? (
              <img src={adminAvatar} alt={adminName} className="w-8 h-8 rounded-full object-cover border-2 border-primary-foreground/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-heading text-xs font-bold">
                {adminName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-body text-xs text-primary-foreground font-semibold truncate">{adminName}</p>
              <p className="font-body text-[10px] text-primary-foreground/50 uppercase tracking-wider">Administrador</p>
            </div>
          </div>
        )}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-foreground/10 border border-primary-foreground/10">
            <Shield className="w-4 h-4 text-primary-foreground/70" />
            <span className="font-body text-xs text-primary-foreground/70 uppercase tracking-widest font-semibold">Painel Admin</span>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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
      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <div className="sticky top-14 md:top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-4">
          <motion.h1
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-heading text-lg md:text-xl font-bold text-foreground"
          >
            {tabs.find((t) => t.key === activeTab)?.label}
          </motion.h1>
        </div>

        <div className="p-4 md:p-8">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "agenda" && <AdminAgenda />}
          {activeTab === "services" && <AdminServices />}
          {activeTab === "pricing" && <AdminPricing />}
          {activeTab === "payments" && <AdminPaymentSettings initialSettings={settingsMap} />}
          {activeTab === "branding" && <AdminBranding />}
          {activeTab === "partners" && <AdminPartners />}
          {activeTab === "partner-view" && <AdminPartnerView />}
          {activeTab === "whatsapp" && <AdminWhatsApp />}
          {activeTab === "client-plans" && <AdminClientPlans />}
          {activeTab === "history" && <AdminHistory />}
          {activeTab === "users" && <AdminUsers />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
