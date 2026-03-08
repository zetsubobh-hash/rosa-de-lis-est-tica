import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, QrCode, Wifi, WifiOff, Save, RefreshCw, Loader2, Power, PowerOff, Trash2, Bell, Mail, Ban, ChevronDown, ChevronUp, Info, ShieldCheck, CalendarClock, Send, Cake, Users, Check, Dices } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import BirthdayRouletteComponent from "@/components/BirthdayRoulette";
import ClientBirthdayPreview from "@/components/admin/ClientBirthdayPreview";

const CONFIG_KEYS = ["evolution_api_url", "evolution_api_key", "evolution_instance_name", "evolution_enabled", "evolution_notifications_enabled"];

const MSG_KEYS = [
  "whatsapp_msg_confirmation_enabled", "whatsapp_msg_confirmation_text",
  "whatsapp_msg_reminder_enabled", "whatsapp_msg_reminder_text",
  "whatsapp_msg_cancellation_enabled", "whatsapp_msg_cancellation_text",
  "whatsapp_msg_reschedule_enabled", "whatsapp_msg_reschedule_text",
  "whatsapp_msg_partner_enabled", "whatsapp_msg_partner_text",
  "whatsapp_msg_admin_enabled", "whatsapp_msg_admin_text",
  "whatsapp_msg_birthday_enabled", "whatsapp_msg_birthday_text",
  "whatsapp_msg_birthday_client_enabled", "whatsapp_msg_birthday_client_text",
  "birthday_gift_type", "birthday_gift_discount", "birthday_gift_service", "birthday_gift_custom_text",
  "birthday_roulette_enabled",
  "whatsapp_msg_roulette_client_enabled", "whatsapp_msg_roulette_client_text",
  "whatsapp_msg_roulette_admin_enabled", "whatsapp_msg_roulette_admin_text",
  "whatsapp_msg_roulette_invite_enabled", "whatsapp_msg_roulette_invite_text",
];

const ALL_KEYS = [...CONFIG_KEYS, ...MSG_KEYS];

const DEFAULT_TEMPLATES: Record<string, string> = {
  whatsapp_msg_confirmation_text: "Olá, aqui é da *{empresa}*! ✅\n\n{nome}! ✅ Seu agendamento de *{servico}* foi confirmado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕",
  whatsapp_msg_reminder_text: "Olá, aqui é da *{empresa}*! ✅\n\n{nome}! 🔔 Lembrete: você tem um agendamento de *{servico}* amanhã, dia *{data}* às *{hora}*. Te esperamos! 💖",
  whatsapp_msg_cancellation_text: "Olá, aqui é da *{empresa}*! ✅\n\n{nome}, seu agendamento de *{servico}* do dia *{data}* às *{hora}* foi cancelado. Caso queira reagendar, entre em contato conosco. 🌸",
  whatsapp_msg_reschedule_text: "Olá, aqui é da *{empresa}*! ✅\n\n{nome}! 🔄 Seu agendamento de *{servico}* foi reagendado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕",
  whatsapp_msg_partner_text: "🔔 Novo agendamento! Cliente: *{nome}* | Serviço: *{servico}* | Data: *{data}* às *{hora}*.",
  whatsapp_msg_admin_text: "🔔 Novo agendamento do Cliente: *{nome}* | Serviço: *{servico}* | Data: *{data}* às *{hora}*.",
  whatsapp_msg_birthday_text: "🎂 *Aniversariante do dia!*\n\n👤 *Nome:* {nome}\n🎈 *Idade:* {idade} anos\n📱 *Telefone:* {telefone}\n\n🎁 *Brinde configurado:* {brinde}\n\n_Lembre-se de entrar em contato para parabenizar e oferecer o presente!_ 💕\n\n— *{empresa}*",
  whatsapp_msg_birthday_client_text: "🎉 *Feliz Aniversário, {nome}!* 🎂\n\nHoje é o seu dia especial e nós da *{empresa}* queremos te parabenizar! 🥳\n\nPreparamos um presente pra você: 🎁\n*{brinde}*\n\nEntre em contato conosco para resgatar seu presente! 💕\n\nUm abraço carinhoso de toda a equipe! 💖\n\n— *{empresa}*",
  whatsapp_msg_roulette_client_text: "🎰 *Parabéns, {nome}!* 🎉\n\nVocê girou a roleta de aniversário da *{empresa}* e ganhou:\n🎁 *{premio}*\n\n🎟️ Código: *{cupom}*\n📅 Válido por 30 dias\n\nUse no checkout do app para resgatar! 💕\n\n— *{empresa}*",
  whatsapp_msg_roulette_admin_text: "🎰 *Roleta de Aniversário!*\n\n👤 *{nome}* girou a roleta e ganhou:\n🎁 *{premio}*\n🎟️ Cupom: *{cupom}*\n📱 Telefone: {telefone}\n\n— *{empresa}*",
  whatsapp_msg_roulette_invite_text: "🎂 *Feliz Aniversário, {nome}!* 🎉\n\nHoje é o seu dia especial e nós da *{empresa}* queremos te parabenizar! 🥳💖\n\n🎰 Temos uma surpresa pra você: uma *Roleta de Prêmios* te esperando no nosso app!\n\nGire a roleta e ganhe um presente exclusivo de aniversário! 🎁✨\n\n👉 Acesse agora e descubra o que preparamos pra você!\n\nUm abraço carinhoso de toda a equipe! 💕\n\n— *{empresa}*",
};

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
  {
    key: "birthday",
    label: "🎂 Aniversário — Aviso ao Admin",
    description: "Enviada aos admins diariamente às 8h quando um cliente faz aniversário",
    icon: Cake,
    enabledKey: "whatsapp_msg_birthday_enabled",
    textKey: "whatsapp_msg_birthday_text",
    variables: ["{nome}", "{idade}", "{telefone}", "{empresa}", "{brinde}", "{cupom}"],
  },
  {
    key: "birthday_client",
    label: "🎁 Aniversário — Parabéns ao Cliente",
    description: "Enviada diretamente ao cliente aniversariante com o brinde configurado",
    icon: Cake,
    enabledKey: "whatsapp_msg_birthday_client_enabled",
    textKey: "whatsapp_msg_birthday_client_text",
    variables: ["{nome}", "{idade}", "{empresa}", "{brinde}", "{cupom}"],
  },
  {
    key: "roulette_client",
    label: "🎰 Roleta — Prêmio ao Cliente",
    description: "Enviada ao cliente quando ele gira a roleta e ganha um prêmio",
    icon: Dices,
    enabledKey: "whatsapp_msg_roulette_client_enabled",
    textKey: "whatsapp_msg_roulette_client_text",
    variables: ["{nome}", "{empresa}", "{premio}", "{cupom}"],
  },
  {
    key: "roulette_admin",
    label: "🎰 Roleta — Aviso ao Admin",
    description: "Enviada aos admins quando um cliente gira a roleta",
    icon: Dices,
    enabledKey: "whatsapp_msg_roulette_admin_enabled",
    textKey: "whatsapp_msg_roulette_admin_text",
    variables: ["{nome}", "{telefone}", "{empresa}", "{premio}", "{cupom}"],
  },
  {
    key: "roulette_invite",
    label: "🎂 Roleta — Convite de Aniversário",
    description: "Enviada ao cliente aniversariante convidando para girar a roleta de prêmios",
    icon: Cake,
    enabledKey: "whatsapp_msg_roulette_invite_enabled",
    textKey: "whatsapp_msg_roulette_invite_text",
    variables: ["{nome}", "{idade}", "{empresa}"],
  },
];

const AdminWhatsApp = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<{ slug: string; title: string }[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá, aqui é da *{empresa}*! ✅\n\nOlá {nome}! Seu agendamento de *{servico}* foi confirmado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕");
  const [testSending, setTestSending] = useState(false);
  const [tplTestPhone, setTplTestPhone] = useState<Record<string, string>>({});
  const [tplTestSending, setTplTestSending] = useState<Record<string, boolean>>({});
  const [partners, setPartners] = useState<{ id: string; full_name: string; phone: string; user_id: string }[]>([]);
  const [admins, setAdmins] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const DEFAULT_BROADCAST_MSG = "Olá *{nome}*! 🌟\n\nTemos uma novidade na *{empresa}*! 🎉\n\nAgora você pode preencher a *Ficha de Anamnese* digital dos seus clientes diretamente pelo sistema! 📋✨\n\nAcesse seu painel para conferir todas as novidades.\n\nQualquer dúvida, estamos à disposição! 💕";
  const [broadcastMsg, setBroadcastMsg] = useState(DEFAULT_BROADCAST_MSG);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [showRouletteTest, setShowRouletteTest] = useState(false);
  const [showClientPreview, setShowClientPreview] = useState(false);

  useEffect(() => {
    const fetchExtras = async () => {
      const [{ data: svcData }, { data: partnerData }, { data: adminRoles }] = await Promise.all([
        supabase.from("services").select("slug, title").eq("is_active", true).order("sort_order"),
        supabase.from("partners").select("id, full_name, phone, user_id").eq("is_active", true).order("full_name"),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
      ]);
      setServices(svcData || []);
      setPartners(partnerData || []);
      // Fetch admin profiles
      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: any) => r.user_id);
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", adminUserIds);
        setAdmins((adminProfiles || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name, phone: p.phone })));
      }
    };
    fetchExtras();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("key, value")
        .in("key", ALL_KEYS);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value; });
      // Apply default templates for empty fields
      for (const [key, defaultVal] of Object.entries(DEFAULT_TEMPLATES)) {
        if (!map[key]) map[key] = defaultVal;
      }

      // Keep birthday automations enabled by default when setting is missing
      if (!map.whatsapp_msg_birthday_enabled) map.whatsapp_msg_birthday_enabled = "true";
      if (!map.whatsapp_msg_birthday_client_enabled) map.whatsapp_msg_birthday_client_enabled = "true";
      if (!map.whatsapp_msg_roulette_client_enabled) map.whatsapp_msg_roulette_client_enabled = "true";
      if (!map.whatsapp_msg_roulette_admin_enabled) map.whatsapp_msg_roulette_admin_enabled = "true";

      setSettings(map);
      setLoading(false);
    };
    fetchData();
  }, []);

  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Debounce auto-save per key (500ms for text, instant for toggles)
    const isToggle = key.includes("_enabled") || key === "birthday_gift_type";
    const delay = isToggle ? 0 : 500;

    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase
          .from("payment_settings")
          .upsert({ key, value, updated_by: session?.user?.id }, { onConflict: "key" });
      } catch {
        // silent fail — user can still use manual save as fallback
      }
    }, delay);
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
    const url = `${SUPABASE_URL}/functions/v1/evolution`;
    console.log("[Evolution] calling:", url, "action:", action);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action }),
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("[Evolution] Non-JSON response:", res.status, text.substring(0, 200));
      throw new Error(`Erro de conexão com a API (status ${res.status}). Verifique se o site foi republicado.`);
    }
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
        `${SUPABASE_URL}/functions/v1/evolution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: "send_test", phone: rawPhone, message: testMessage }),
        }
      );
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        console.error("[Evolution] Non-JSON response:", res.status, text.substring(0, 200));
        throw new Error(`Erro de conexão com a API (status ${res.status}).`);
      }
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

  // Build dynamic gift text from current settings
  const buildGiftText = (couponCode = "") => {
    switch (settings.birthday_gift_type) {
      case "discount": {
        const base = settings.birthday_gift_discount
          ? `Cupom de ${settings.birthday_gift_discount} de desconto`
          : "Um desconto especial";
        return couponCode ? `${base}\n🎟️ Código do cupom: ${couponCode}` : base;
      }
      case "session":
        return settings.birthday_gift_service
          ? `1 sessão gratuita de ${settings.birthday_gift_service}`
          : "1 sessão gratuita";
      case "custom":
        return settings.birthday_gift_custom_text || "Um presente especial";
      default:
        return "Uma surpresa especial";
    }
  };

  const handleSendTemplateTest = async (tplKey: string, textKey: string) => {
    const phone = tplTestPhone[tplKey] || "";
    const rawPhone = testPhoneToRaw(phone);
    if (!rawPhone || rawPhone.length < 12) {
      toast({ title: "Informe o número", description: "Digite um número válido para enviar o teste.", variant: "destructive" });
      return;
    }
    setTplTestSending((prev) => ({ ...prev, [tplKey]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sampleCoupon = settings.birthday_gift_type === "discount" ? "ANIV-TEST-2026" : "";
      const giftText = buildGiftText(sampleCoupon);
      // Replace variables with example values
      const text = (settings[textKey] || "")
        .replace(/{nome}/g, "Maria Exemplo")
        .replace(/{servico}/g, "Limpeza de Pele")
        .replace(/{data}/g, "15/04/2026")
        .replace(/{hora}/g, "14:00")
        .replace(/{empresa}/g, "Rosa de Lis")
        .replace(/{idade}/g, "30")
        .replace(/{telefone}/g, "(11) 99999-9999")
        .replace(/{cupom}/g, sampleCoupon || "ANIV-TEST-2026")
        .replace(/{brinde}/g, giftText)
        .replace(/{premio}/g, "40% de desconto");
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/evolution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: "send_test", phone: rawPhone, message: text }),
        }
      );
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error(`Erro de conexão (status ${res.status}).`);
      }
      const data = await res.json();
      if (data.success) {
        toast({ title: "✅ Teste enviado!", description: `Mensagem enviada para ${phone}` });
      } else {
        toast({ title: "Erro ao enviar", description: data.error || "Falha", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setTplTestSending((prev) => ({ ...prev, [tplKey]: false }));
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
    <div className="space-y-4 sm:space-y-6 w-full max-w-2xl mx-auto">
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
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-body text-xs font-semibold text-foreground">Texto da mensagem</label>
                            {DEFAULT_TEMPLATES[tpl.textKey] && settings[tpl.textKey] !== DEFAULT_TEMPLATES[tpl.textKey] && (
                              <button
                                type="button"
                                onClick={() => updateField(tpl.textKey, DEFAULT_TEMPLATES[tpl.textKey])}
                                className="flex items-center gap-1 font-body text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Restaurar original
                              </button>
                            )}
                          </div>
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

                        {/* Per-template test send */}
                        <div className="border-t border-border pt-3 space-y-2">
                          <label className="font-body text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Send className="w-3.5 h-3.5 text-primary" />
                            Enviar teste desta mensagem
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="(11) 99999-9999"
                              value={tplTestPhone[tpl.key] || ""}
                              onChange={(e) => setTplTestPhone((prev) => ({ ...prev, [tpl.key]: formatTestPhone(e.target.value) }))}
                              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <button
                              onClick={() => handleSendTemplateTest(tpl.key, tpl.textKey)}
                              disabled={tplTestSending[tpl.key]}
                              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {tplTestSending[tpl.key] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Testar
                            </button>
                          </div>
                          <p className="font-body text-[10px] text-muted-foreground">As variáveis serão substituídas por dados de exemplo.</p>
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

      {/* ═══════════ ANIVERSÁRIO — BRINDE + ROLETA (UNIFICADO) ═══════════ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="bg-card rounded-2xl border border-border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Cake className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">🎂 Aniversário — Brinde & Roleta</h3>
        </div>

        {/* ── Roleta toggle ── */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-primary" />
            <div>
              <p className="font-body text-xs font-semibold text-foreground">🎰 Roleta de Aniversário</p>
              <p className="font-body text-[11px] text-muted-foreground">
                Quando ativada, o cliente vê uma roleta ao acessar o app no dia do aniversário e ganha um prêmio aleatório (desconto de 10% a 60% ou sessão gratuita).
              </p>
            </div>
          </div>
          <Switch
            checked={settings.birthday_roulette_enabled === "true"}
            onCheckedChange={(checked) => updateField("birthday_roulette_enabled", checked ? "true" : "false")}
          />
        </div>

        {settings.birthday_roulette_enabled === "true" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowRouletteTest(true)}
              className="flex-1 py-2.5 rounded-xl border border-primary/30 text-primary font-body text-xs font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Dices className="w-4 h-4" />
              Testar Roleta
            </button>
            <button
              type="button"
              onClick={() => setShowClientPreview(true)}
              className="flex-1 py-2.5 rounded-xl border border-primary/30 text-primary font-body text-xs font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Cake className="w-4 h-4" />
              Simular Visão do Cliente
            </button>
          </div>
        )}

        {showRouletteTest && (
          <BirthdayRouletteComponent testMode onClose={() => setShowRouletteTest(false)} />
        )}

        {showClientPreview && (
          <ClientBirthdayPreview onClose={() => setShowClientPreview(false)} />
        )}

        {/* ── Brinde direto (quando roleta desativada) ── */}
        {settings.birthday_roulette_enabled !== "true" && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <p className="font-body text-xs font-semibold text-foreground mb-1">Brinde de Aniversário (envio direto)</p>
              <p className="font-body text-[11px] text-muted-foreground">
                Configure o presente enviado automaticamente ao cliente. O valor é inserido na variável <code className="text-[11px] font-mono bg-muted border border-border rounded px-1 py-0.5">{"{brinde}"}</code> dos templates.
              </p>
            </div>

            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-2 block">Tipo do brinde</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "discount", label: "💰 Cupom de Desconto" },
                  { value: "session", label: "💆 Sessão Gratuita" },
                  { value: "custom", label: "✍️ Texto Livre" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("birthday_gift_type", opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      settings.birthday_gift_type === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {settings.birthday_gift_type === "discount" && (
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-1 block">Valor do desconto</label>
                <input
                  type="text"
                  value={settings.birthday_gift_discount || ""}
                  onChange={(e) => updateField("birthday_gift_discount", e.target.value)}
                  placeholder="Ex: 20% ou R$ 50,00"
                  className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="font-body text-[11px] text-muted-foreground mt-1">Será substituído em {"{brinde}"} como: "Cupom de 20% de desconto"</p>
              </div>
            )}

            {settings.birthday_gift_type === "session" && (
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-1 block">Serviço da sessão gratuita</label>
                <select
                  value={settings.birthday_gift_service || ""}
                  onChange={(e) => updateField("birthday_gift_service", e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map((s) => (
                    <option key={s.slug} value={s.title}>{s.title}</option>
                  ))}
                </select>
                <p className="font-body text-[11px] text-muted-foreground mt-1">Será substituído em {"{brinde}"} como: "1 sessão gratuita de {settings.birthday_gift_service || 'Serviço'}"</p>
              </div>
            )}

            {settings.birthday_gift_type === "custom" && (
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-1 block">Descrição do brinde</label>
                <input
                  type="text"
                  value={settings.birthday_gift_custom_text || ""}
                  onChange={(e) => updateField("birthday_gift_custom_text", e.target.value)}
                  placeholder="Ex: Ganhe um kit de hidratação especial!"
                  className="w-full h-10 rounded-xl border border-border bg-background px-4 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <p className="font-body text-[11px] text-muted-foreground mt-1">Será substituído em {"{brinde}"} exatamente como digitado</p>
              </div>
            )}

            {!settings.birthday_gift_type && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50">
                <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="font-body text-[11px] text-muted-foreground">
                  Selecione um tipo de brinde acima. O valor configurado será inserido automaticamente na variável {"{brinde}"} das mensagens de aniversário.
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ═══════════ BROADCAST TO PARTNERS ═══════════ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Enviar Mensagem aos Parceiros e Admins</h3>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          Envie comunicados, novidades ou mensagens personalizadas diretamente para os parceiros e administradores selecionados via WhatsApp.
        </p>

        {/* Partner selection */}
        <div>
          <label className="font-body text-xs font-semibold text-foreground mb-2 block">Parceiros</label>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                if (selectedPartners.length === partners.length) {
                  setSelectedPartners([]);
                } else {
                  setSelectedPartners(partners.map((p) => p.id));
                }
              }}
              className="font-body text-xs text-primary hover:underline"
            >
              {selectedPartners.length === partners.length && partners.length > 0 ? "Desmarcar todos" : "Selecionar todos parceiros"}
            </button>
            <div className="flex flex-wrap gap-2">
              {partners.map((p) => {
                const isSelected = selectedPartners.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setSelectedPartners((prev) =>
                        isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {p.full_name}
                  </button>
                );
              })}
            </div>
            {partners.length === 0 && (
              <p className="font-body text-xs text-muted-foreground">Nenhum parceiro ativo encontrado.</p>
            )}
          </div>
        </div>

        {/* Admin selection */}
        {admins.length > 0 && (
          <div>
            <label className="font-body text-xs font-semibold text-foreground mb-2 block">Administradores</label>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  if (selectedAdmins.length === admins.length) {
                    setSelectedAdmins([]);
                  } else {
                    setSelectedAdmins(admins.map((a) => a.id));
                  }
                }}
                className="font-body text-xs text-primary hover:underline"
              >
                {selectedAdmins.length === admins.length ? "Desmarcar todos" : "Selecionar todos admins"}
              </button>
              <div className="flex flex-wrap gap-2">
                {admins.map((a) => {
                  const isSelected = selectedAdmins.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        setSelectedAdmins((prev) =>
                          isSelected ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                        )
                      }
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-accent text-accent-foreground border-accent"
                          : "border-border text-foreground hover:border-accent/50"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      🛡️ {a.full_name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs font-semibold text-foreground">Mensagem</label>
            {broadcastMsg !== DEFAULT_BROADCAST_MSG && (
              <button
                type="button"
                onClick={() => setBroadcastMsg(DEFAULT_BROADCAST_MSG)}
                className="flex items-center gap-1 font-body text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Restaurar original
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            placeholder="Digite a mensagem..."
          />
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/50 mt-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-body text-[11px] text-muted-foreground font-semibold mb-1">Variáveis disponíveis:</p>
              <div className="flex flex-wrap gap-1.5">
                {["{nome}", "{empresa}"].map((v) => (
                  <code key={v} className="text-[11px] font-mono bg-background border border-border rounded px-1.5 py-0.5 text-foreground">{v}</code>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={async () => {
            const totalSelected = selectedPartners.length + selectedAdmins.length;
            if (totalSelected === 0) {
              toast({ title: "Selecione destinatários", description: "Escolha pelo menos um parceiro ou admin.", variant: "destructive" });
              return;
            }
            if (!broadcastMsg.trim()) {
              toast({ title: "Mensagem vazia", variant: "destructive" });
              return;
            }
            setBroadcastSending(true);
            let sent = 0;
            let failed = 0;
            const { data: { session } } = await supabase.auth.getSession();

            // Build recipients list
            const recipients: { name: string; phone: string }[] = [];
            for (const pid of selectedPartners) {
              const p = partners.find((x) => x.id === pid);
              if (p?.phone) recipients.push({ name: p.full_name, phone: p.phone });
            }
            for (const aid of selectedAdmins) {
              const a = admins.find((x) => x.id === aid);
              if (a?.phone) recipients.push({ name: a.full_name, phone: a.phone });
            }

            for (const r of recipients) {
              const rawPhone = `55${r.phone.replace(/\D/g, "")}`;
              const text = broadcastMsg
                .replace(/{nome}/g, r.name)
                .replace(/{empresa}/g, "Rosa de Lis");
              try {
                const res = await fetch(`${SUPABASE_URL}/functions/v1/evolution`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                    apikey: SUPABASE_ANON_KEY,
                  },
                  body: JSON.stringify({ action: "send_test", phone: rawPhone, message: text }),
                });
                const data = await res.json();
                if (data.success) sent++;
                else failed++;
              } catch {
                failed++;
              }
            }
            setBroadcastSending(false);
            toast({
              title: `📤 Envio concluído`,
              description: `${sent} enviada(s) com sucesso${failed > 0 ? `, ${failed} falha(s)` : ""}`,
            });
          }}
          disabled={broadcastSending || (selectedPartners.length + selectedAdmins.length) === 0}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {broadcastSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {broadcastSending ? "Enviando..." : `Enviar para ${selectedPartners.length + selectedAdmins.length} destinatário(s)`}
        </button>
      </motion.div>

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
        <div>
          <label className="font-body text-xs text-muted-foreground mb-1 block">Texto da mensagem de teste</label>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className="font-body text-xs text-muted-foreground">Variáveis:</span>
            {["{nome}", "{servico}", "{data}", "{hora}", "{empresa}"].map((v) => (
              <span key={v} className="font-body text-xs bg-muted px-1.5 py-0.5 rounded">{v}</span>
            ))}
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
