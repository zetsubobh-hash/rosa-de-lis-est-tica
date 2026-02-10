import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Save, QrCode, CreditCard, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form state
  const [pixEnabled, setPixEnabled] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [pixBeneficiary, setPixBeneficiary] = useState("");
  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");

  useEffect(() => {
    if (!roleLoading && (!user || !isAdmin)) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("payment_settings").select("key, value");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => { map[row.key] = row.value; });
        setPixEnabled(map.pix_enabled === "true");
        setPixKey(map.pix_key || "");
        setPixKeyType(map.pix_key_type || "cpf");
        setPixBeneficiary(map.pix_beneficiary || "");
        setMpEnabled(map.mercadopago_enabled === "true");
        setMpPublicKey(map.mercadopago_public_key || "");
        setMpAccessToken(map.mercadopago_access_token || "");
      }
      setLoading(false);
    };
    if (isAdmin) fetch();
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      { key: "pix_enabled", value: String(pixEnabled) },
      { key: "pix_key", value: pixKey },
      { key: "pix_key_type", value: pixKeyType },
      { key: "pix_beneficiary", value: pixBeneficiary },
      { key: "mercadopago_enabled", value: String(mpEnabled) },
      { key: "mercadopago_public_key", value: mpPublicKey },
      { key: "mercadopago_access_token", value: mpAccessToken },
    ];

    try {
      for (const u of updates) {
        const { error } = await supabase
          .from("payment_settings")
          .update({ value: u.value, updated_by: user?.id })
          .eq("key", u.key);
        if (error) throw error;
      }
      toast({ title: "Configurações salvas! ✅" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* PIX Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">PIX Manual</h2>
            <label className="ml-auto flex items-center gap-2 cursor-pointer">
              <span className="font-body text-sm text-muted-foreground">{pixEnabled ? "Ativo" : "Inativo"}</span>
              <button
                onClick={() => setPixEnabled(!pixEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${pixEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${pixEnabled ? "translate-x-5" : ""}`} />
              </button>
            </label>
          </div>

          {pixEnabled && (
            <div className="space-y-4">
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-1 block">Tipo da Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave aleatória</option>
                </select>
              </div>
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-1 block">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite a chave PIX"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-1 block">Nome do Beneficiário</label>
                <input
                  type="text"
                  value={pixBeneficiary}
                  onChange={(e) => setPixBeneficiary(e.target.value)}
                  placeholder="Nome que aparece no PIX"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Mercado Pago Settings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-3xl border border-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">Mercado Pago</h2>
            <label className="ml-auto flex items-center gap-2 cursor-pointer">
              <span className="font-body text-sm text-muted-foreground">{mpEnabled ? "Ativo" : "Inativo"}</span>
              <button
                onClick={() => setMpEnabled(!mpEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${mpEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${mpEnabled ? "translate-x-5" : ""}`} />
              </button>
            </label>
          </div>

          {mpEnabled && (
            <div className="space-y-4">
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-1 block">Public Key</label>
                <input
                  type="text"
                  value={mpPublicKey}
                  onChange={(e) => setMpPublicKey(e.target.value)}
                  placeholder="APP_USR-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="font-body text-sm font-semibold text-foreground mb-1 block">Access Token</label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={mpAccessToken}
                    onChange={(e) => setMpAccessToken(e.target.value)}
                    placeholder="APP_USR-..."
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Save button */}
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 uppercase tracking-wider"
        >
          <Save className="w-5 h-5" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </motion.button>
      </div>

      <Footer />
    </div>
  );
};

export default Admin;
