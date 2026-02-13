import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, QrCode, CreditCard, Eye, EyeOff, ChevronDown, RefreshCw, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Props {
  initialSettings: Record<string, string>;
}

const AdminPaymentSettings = ({ initialSettings }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [pixEnabled, setPixEnabled] = useState(initialSettings.pix_enabled === "true");
  const [pixKey, setPixKey] = useState(initialSettings.pix_key || "");
  const [pixKeyType, setPixKeyType] = useState(initialSettings.pix_key_type || "cpf");
  const [pixBeneficiary, setPixBeneficiary] = useState(initialSettings.pix_beneficiary || "");
  const [mpEnabled, setMpEnabled] = useState(initialSettings.mercadopago_enabled === "true");
  const [mpPublicKey, setMpPublicKey] = useState(initialSettings.mercadopago_public_key || "");
  const [mpAccessToken, setMpAccessToken] = useState(initialSettings.mercadopago_access_token || "");

  const [pixSettingsOpen, setPixSettingsOpen] = useState(false);
  const [qrKey, setQrKey] = useState(Date.now());

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
      setQrKey(Date.now()); // regenera QR após salvar
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* PIX */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <QrCode className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">PIX Manual</h2>
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <span className="font-body text-sm text-muted-foreground">{pixEnabled ? "Ativo" : "Inativo"}</span>
            <button onClick={() => setPixEnabled(!pixEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${pixEnabled ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${pixEnabled ? "translate-x-5" : ""}`} />
            </button>
          </label>
        </div>

        {pixEnabled && (
          <div className="space-y-5">
            {/* QR Code — sempre visível */}
            {pixKey ? (
              <div className="space-y-4 text-center">
                <p className="font-body text-sm font-semibold text-foreground">
                  Mostre ao cliente para pagar via PIX
                </p>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-border inline-block">
                    <img
                      key={qrKey}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixKey)}&margin=8`}
                      alt="QR Code PIX"
                      className="w-52 h-52"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-body text-sm font-semibold text-foreground">{pixBeneficiary || "—"}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    Chave: <span className="font-medium text-foreground select-all">{pixKey}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrKey(Date.now())}
                  className="gap-2 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regerar QR Code
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Configure a chave PIX abaixo para gerar o QR Code
                </p>
              </div>
            )}

            {/* Accordion — Configurações PIX */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setPixSettingsOpen(!pixSettingsOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="font-body text-sm font-semibold text-foreground flex-1 text-left">
                  Configurações do PIX
                </span>
                <motion.div
                  animate={{ rotate: pixSettingsOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>

              <AnimatePresence>
                {pixSettingsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-border">
                      <div>
                        <label className="font-body text-sm font-semibold text-foreground mb-1 block">Tipo da Chave</label>
                        <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="email">E-mail</option>
                          <option value="phone">Telefone</option>
                          <option value="random">Chave aleatória</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-body text-sm font-semibold text-foreground mb-1 block">Chave PIX</label>
                        <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite a chave PIX" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="font-body text-sm font-semibold text-foreground mb-1 block">Nome do Beneficiário</label>
                        <input type="text" value={pixBeneficiary} onChange={(e) => setPixBeneficiary(e.target.value)} placeholder="Nome que aparece no PIX" className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mercado Pago */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-3xl border border-border p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">Mercado Pago</h2>
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <span className="font-body text-sm text-muted-foreground">{mpEnabled ? "Ativo" : "Inativo"}</span>
            <button onClick={() => setMpEnabled(!mpEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${mpEnabled ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow transition-transform ${mpEnabled ? "translate-x-5" : ""}`} />
            </button>
          </label>
        </div>
        {mpEnabled && (
          <div className="space-y-4">
            <div>
              <label className="font-body text-sm font-semibold text-foreground mb-1 block">Public Key</label>
              <input type="text" value={mpPublicKey} onChange={(e) => setMpPublicKey(e.target.value)} placeholder="APP_USR-..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="font-body text-sm font-semibold text-foreground mb-1 block">Access Token</label>
              <div className="relative">
                <input type={showToken ? "text" : "password"} value={mpAccessToken} onChange={(e) => setMpAccessToken(e.target.value)} placeholder="APP_USR-..." className="w-full px-4 py-2.5 pr-12 rounded-xl border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="font-body text-xs text-muted-foreground mt-1">Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais</p>
            </div>
          </div>
        )}
      </motion.div>

      <motion.button onClick={handleSave} disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 uppercase tracking-wider">
        <Save className="w-5 h-5" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </motion.button>
    </div>
  );
};

export default AdminPaymentSettings;
