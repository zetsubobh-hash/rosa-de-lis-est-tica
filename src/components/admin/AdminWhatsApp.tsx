import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, QrCode, Wifi, WifiOff, Save, RefreshCw, Loader2, Power, PowerOff, Trash2, Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const KEYS = ["evolution_api_url", "evolution_api_key", "evolution_instance_name", "evolution_enabled", "evolution_notifications_enabled"];

const AdminWhatsApp = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("key, value")
        .in("key", KEYS);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      for (const key of KEYS) {
        const value = settings[key] || "";
        await supabase
          .from("payment_settings")
          .upsert({ key, value, updated_by: userId }, { onConflict: "key" });
      }

      toast({ title: "Configurações salvas!", description: "Evolution API atualizada com sucesso." });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  const callEvolution = async (action: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action }),
      }
    );
    return res.json();
  };

  const handleCreateAndConnect = async () => {
    setQrLoading(true);
    setQrCode(null);
    try {
      // First try to create instance (may already exist)
      await callEvolution("create_instance");
      // Then get QR code
      const data = await callEvolution("get_qrcode");
      if (data.base64) {
        setQrCode(data.base64);
      } else if (data.code) {
        setQrCode(data.code);
      } else if (data.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "QR Code não disponível", description: "A instância pode já estar conectada. Verifique o status.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar QR Code", description: e.message, variant: "destructive" });
    }
    setQrLoading(false);
  };

  const handleCheckStatus = async () => {
    setStatusLoading(true);
    try {
      const data = await callEvolution("check_status");
      const state = data?.instance?.state || data?.state || "unknown";
      setConnectionStatus(state);
      toast({
        title: "Status da conexão",
        description: state === "open" ? "✅ Conectado e funcionando!" : `Status atual: ${state}`,
      });
    } catch {
      toast({ title: "Erro ao verificar status", variant: "destructive" });
    }
    setStatusLoading(false);
  };

  const handleLogout = async () => {
    try {
      await callEvolution("logout");
      setConnectionStatus("close");
      setQrCode(null);
      toast({ title: "Desconectado", description: "Instância desconectada do WhatsApp." });
    } catch {
      toast({ title: "Erro ao desconectar", variant: "destructive" });
    }
  };

  const isEnabled = settings.evolution_enabled === "true";
  const isConfigured = !!(settings.evolution_api_url && settings.evolution_api_key && settings.evolution_instance_name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">Evolution API — WhatsApp</h2>
          <p className="font-body text-xs text-muted-foreground">Configure a integração para disparo de mensagens automáticas</p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Power className="w-5 h-5 text-emerald-600" />
            ) : (
              <PowerOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-heading text-sm font-bold text-foreground">
                Integração {isEnabled ? "Ativada" : "Desativada"}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {isEnabled ? "Mensagens automáticas estão habilitadas" : "Ative para começar a disparar mensagens"}
              </p>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => updateField("evolution_enabled", checked ? "true" : "false")}
          />
        </div>
      </motion.div>

      {/* Notifications Toggle */}
      {isEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.evolution_notifications_enabled === "true" ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-heading text-sm font-bold text-foreground">
                  Notificações de Agendamento
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {settings.evolution_notifications_enabled === "true"
                    ? "Admins e parceiros recebem WhatsApp a cada novo agendamento"
                    : "Desativado — nenhuma notificação será enviada"}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.evolution_notifications_enabled === "true"}
              onCheckedChange={(checked) => updateField("evolution_notifications_enabled", checked ? "true" : "false")}
            />
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-5 space-y-4"
      >
        <h3 className="font-heading text-sm font-bold text-foreground">Configuração da API</h3>

        <div className="space-y-3">
          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">URL da API</label>
            <input
              type="url"
              value={settings.evolution_api_url || ""}
              onChange={(e) => updateField("evolution_api_url", e.target.value)}
              placeholder="https://sua-instancia.evolution-api.com"
              className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">API Key</label>
            <input
              type="password"
              value={settings.evolution_api_key || ""}
              onChange={(e) => updateField("evolution_api_key", e.target.value)}
              placeholder="Sua chave API da Evolution"
              className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">Nome da Instância</label>
            <input
              type="text"
              value={settings.evolution_instance_name || ""}
              onChange={(e) => updateField("evolution_instance_name", e.target.value)}
              placeholder="rosa-de-lis"
              className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </motion.div>

      {/* QR Code & Connection */}
      {isConfigured && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5 space-y-4"
        >
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Conexão WhatsApp
          </h3>

          {/* Status indicator */}
          {connectionStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body ${
              connectionStatus === "open"
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-amber-500/10 text-amber-700"
            }`}>
              {connectionStatus === "open" ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {connectionStatus === "open" ? "Conectado ao WhatsApp" : `Status: ${connectionStatus}`}
            </div>
          )}

          {/* QR Code display */}
          {qrCode && (
            <div className="flex flex-col items-center py-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64"
                />
              </div>
              <p className="font-body text-xs text-muted-foreground mt-3 text-center max-w-xs">
                Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → Escaneie este QR Code
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleCreateAndConnect}
              disabled={qrLoading}
              className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {qrLoading ? "Gerando..." : "Gerar QR Code"}
            </button>

            <button
              onClick={handleCheckStatus}
              disabled={statusLoading}
              className="flex-1 h-10 rounded-xl border border-border bg-background text-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
            >
              {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Verificar Status
            </button>

            {connectionStatus === "open" && (
              <button
                onClick={handleLogout}
                className="h-10 px-4 rounded-xl border border-destructive/30 text-destructive font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Desconectar
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminWhatsApp;
