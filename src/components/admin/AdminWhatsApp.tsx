import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, QrCode, Wifi, WifiOff, Save, RefreshCw, Loader2, Power, PowerOff, Trash2, Bell, Mail, Ban, ChevronDown, ChevronUp, Info, ShieldCheck, CalendarClock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const CONFIG_KEYS = ["evolution_api_url", "evolution_api_key", "evolution_instance_name", "evolution_enabled", "evolution_notifications_enabled"];

const MSG_KEYS = [
  "whatsapp_msg_confirmation_enabled", "whatsapp_msg_confirmation_text",
  "whatsapp_msg_reminder_enabled", "whatsapp_msg_reminder_text",
  "whatsapp_msg_cancellation_enabled", "whatsapp_msg_cancellation_text",
  "whatsapp_msg_reschedule_enabled", "whatsapp_msg_reschedule_text",
  "whatsapp_msg_partner_enabled", "whatsapp_msg_partner_text",
  "whatsapp_msg_admin_enabled", "whatsapp_msg_admin_text",
];

const ALL_KEYS = [...CONFIG_KEYS, ...MSG_KEYS];

interface MessageTemplate {
  key: string;
  label: string;
  description: string;
  icon: typeof Mail;
  enabledKey: string;
  textKey: string;
  variables: string[];
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "confirmation",
    label: "Confirmação de Agendamento",
    description: "Enviada ao cliente quando o agendamento é confirmado",
    icon: Mail,
    enabledKey: "whatsapp_msg_confirmation_enabled",
    textKey: "whatsapp_msg_confirmation_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
  {
    key: "reminder",
    label: "Lembrete de Agendamento",
    description: "Enviada ao cliente antes do horário marcado",
    icon: Bell,
    enabledKey: "whatsapp_msg_reminder_enabled",
    textKey: "whatsapp_msg_reminder_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
  {
    key: "cancellation",
    label: "Cancelamento",
    description: "Enviada quando um agendamento é cancelado",
    icon: Ban,
    enabledKey: "whatsapp_msg_cancellation_enabled",
    textKey: "whatsapp_msg_cancellation_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
  {
    key: "reschedule",
    label: "Reagendamento",
    description: "Enviada ao cliente, parceiro e admins quando a data/hora é alterada",
    icon: CalendarClock,
    enabledKey: "whatsapp_msg_reschedule_enabled",
    textKey: "whatsapp_msg_reschedule_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
  {
    key: "partner",
    label: "Notificação ao Parceiro",
    description: "Enviada ao profissional quando recebe um novo agendamento",
    icon: MessageCircle,
    enabledKey: "whatsapp_msg_partner_enabled",
    textKey: "whatsapp_msg_partner_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
  {
    key: "admin",
    label: "Notificação ao Administrador",
    description: "Enviada aos admins quando há um novo agendamento",
    icon: ShieldCheck,
    enabledKey: "whatsapp_msg_admin_enabled",
    textKey: "whatsapp_msg_admin_text",
    variables: ["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"],
  },
];

const AdminWhatsApp = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("key, value")
        .in("key", ALL_KEYS);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value; });
      setSettings(map);
      setLoading(false);
    };
    fetchData();
  }, []);

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      for (const key of ALL_KEYS) {
        const value = settings[key] || "";
        await supabase
          .from("payment_settings")
          .upsert({ key, value, updated_by: userId }, { onConflict: "key" });
      }

      toast({ title: "Configurações salvas!", description: "Todas as configurações foram atualizadas." });
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
      await callEvolution("create_instance");
      const data = await callEvolution("get_qrcode");
      if (data.base64) {
        setQrCode(data.base64);
      } else if (data.code) {
        setQrCode(data.code);
      } else if (data.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "QR Code não disponível", description: "A instância pode já estar conectada.", variant: "destructive" });
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

  const formatTestPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    const d = local.slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const testPhoneToRaw = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    return local.length > 0 ? `55${local.slice(0, 11)}` : "";
  };

  const handleSendTest = async () => {
    const rawPhone = testPhoneToRaw(testPhone);
    if (!rawPhone || rawPhone.length < 12) {
      toast({ title: "Informe o número", description: "Digite um número de WhatsApp válido para enviar o teste.", variant: "destructive" });
      return;
    }
    setTestSending(true);
    try {
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
          body: JSON.stringify({ action: "send_test", phone: rawPhone }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Mensagem enviada!", description: `Teste enviado para ${testPhone}` });
      } else {
        toast({ title: "Erro ao enviar", description: data.error || "Falha no envio", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setTestSending(false);
  };

  const isEnabled = settings.evolution_enabled === "true";

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
          <p className="font-body text-xs text-muted-foreground">Configure a integração e gerencie mensagens automáticas</p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? <Power className="w-5 h-5 text-emerald-600" /> : <PowerOff className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="font-heading text-sm font-bold text-foreground">Integração {isEnabled ? "Ativada" : "Desativada"}</p>
              <p className="font-body text-xs text-muted-foreground">{isEnabled ? "Mensagens automáticas estão habilitadas" : "Ative para começar a disparar mensagens"}</p>
            </div>
          </div>
          <Switch checked={isEnabled} onCheckedChange={(checked) => updateField("evolution_enabled", checked ? "true" : "false")} />
        </div>
      </motion.div>

      {/* ═══════════ MESSAGE TEMPLATES ═══════════ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Mensagens Automáticas</h3>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          Configure o texto de cada mensagem e ative/desative individualmente. Use as variáveis para personalizar.
        </p>

        <div className="space-y-2">
          {MESSAGE_TEMPLATES.map((tpl) => {
            const tplEnabled = settings[tpl.enabledKey] === "true";
            const isExpanded = expandedTemplate === tpl.key;
            const Icon = tpl.icon;

            return (
              <div key={tpl.key} className="border border-border rounded-xl overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setExpandedTemplate(isExpanded ? null : tpl.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Icon className={`w-4 h-4 ${tplEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-heading text-sm font-semibold text-foreground truncate">{tpl.label}</p>
                    <p className="font-body text-[11px] text-muted-foreground truncate">{tpl.description}</p>
                  </div>
                  <span className={`text-[10px] font-body font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tplEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {tplEnabled ? "Ativo" : "Inativo"}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        <div className="flex items-center justify-between">
                          <label className="font-body text-xs font-semibold text-foreground">Enviar esta mensagem</label>
                          <Switch
                            checked={tplEnabled}
                            onCheckedChange={(checked) => updateField(tpl.enabledKey, checked ? "true" : "false")}
                          />
                        </div>

                        <div>
                          <label className="font-body text-xs font-semibold text-foreground mb-1 block">Texto da mensagem</label>
                          <textarea
                            rows={4}
                            value={settings[tpl.textKey] || ""}
                            onChange={(e) => updateField(tpl.textKey, e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                            placeholder="Digite o template da mensagem..."
                          />
                        </div>

                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50">
                          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="font-body text-[11px] text-muted-foreground font-semibold mb-1">Variáveis disponíveis:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {tpl.variables.map((v) => (
                                <code key={v} className="text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground">
                                  {v}
                                </code>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* API Configuration */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading text-sm font-bold text-foreground">Configuração da API</h3>
        <div className="space-y-3">
          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">URL da API</label>
            <input type="url" value={settings.evolution_api_url || ""} onChange={(e) => updateField("evolution_api_url", e.target.value)} placeholder="https://sua-instancia.evolution-api.com" className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">API Key</label>
            <input type="password" value={settings.evolution_api_key || ""} onChange={(e) => updateField("evolution_api_key", e.target.value)} placeholder="Sua chave API da Evolution" className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground mb-1 block">Nome da Instância</label>
            <input type="text" value={settings.evolution_instance_name || ""} onChange={(e) => updateField("evolution_instance_name", e.target.value)} placeholder="rosa-de-lis" className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
          </div>
        </div>
      </motion.div>

      {/* QR Code & Connection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          Conexão WhatsApp
        </h3>

        {connectionStatus && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body ${connectionStatus === "open" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
            {connectionStatus === "open" ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connectionStatus === "open" ? "Conectado ao WhatsApp" : `Status: ${connectionStatus}`}
          </div>
        )}

        {qrCode && (
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-64 h-64" />
            </div>
            <p className="font-body text-xs text-muted-foreground mt-3 text-center max-w-xs">
              Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo → Escaneie este QR Code
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={handleCreateAndConnect} disabled={qrLoading} className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            {qrLoading ? "Gerando..." : "Gerar QR Code"}
          </button>
          <button onClick={handleCheckStatus} disabled={statusLoading} className="flex-1 h-10 rounded-xl border border-border bg-background text-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50">
            {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Verificar Status
          </button>
          {connectionStatus === "open" && (
            <button onClick={handleLogout} className="h-10 px-4 rounded-xl border border-destructive/30 text-destructive font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/5 transition-colors">
              <Trash2 className="w-4 h-4" />
              Desconectar
            </button>
          )}
        </div>
      </motion.div>

      {/* Test Message */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Testar Envio
        </h3>
        <p className="font-body text-xs text-muted-foreground">
          Envie uma mensagem de teste para verificar se a integração está funcionando.
        </p>
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Número do WhatsApp</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground pointer-events-none">+55</span>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(formatTestPhone(e.target.value))}
              placeholder="(31) 99999-9999"
              maxLength={15}
              className="w-full h-10 rounded-xl border border-border bg-background pl-12 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleSendTest}
          disabled={testSending}
          className="w-full h-10 rounded-xl bg-emerald-600 text-white font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {testSending ? "Enviando..." : "Enviar Mensagem de Teste"}
        </button>
      </motion.div>

      {/* Save all button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-body text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 uppercase tracking-wider"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Salvando..." : "Salvar Todas as Configurações"}
      </button>
    </div>
  );
};

export default AdminWhatsApp;
