import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, Send, Pencil, Server, Megaphone, Clock,
  Hash, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, QrCode, LogOut, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ───────── types ───────── */
interface EvolutionInstance {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  is_active: boolean;
  sort_order: number;
  msgs_per_cycle: number;
}

interface PromoCampaign {
  id: string;
  title: string;
  service_slug: string | null;
  message_template: string;
  start_time: string;
  interval_seconds: number;
  status: string;
  total_sent: number;
  total_failed: number;
  total_target: number;
  created_at: string;
}

interface CampaignReportRow {
  id: string;
  user_id: string;
  phone: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  instance_id: string | null;
  recipient_name: string;
  instance_label: string;
}

interface ServiceOption {
  slug: string;
  title: string;
}

const DYNAMIC_VARS = [
  { key: "{nome}", label: "Nome do cliente" },
  { key: "{servico}", label: "Nome do serviço" },
  { key: "{empresa}", label: "Nome da empresa" },
  { key: "{telefone}", label: "Telefone do cliente" },
];

const DEFAULT_TEMPLATE =
  "Olá {nome}! 🌸\n\nTemos uma promoção especial para você em *{servico}*!\n\nAgende agora e garanta condições exclusivas.\n\n_{empresa}_";

/* ───────── component ───────── */
const AdminPromoBroadcast = () => {
  const { toast } = useToast();

  // ── instances state
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);
  const [instanceFormOpen, setInstanceFormOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<EvolutionInstance | null>(null);
  const [instForm, setInstForm] = useState({ name: "", api_url: "", api_key: "", instance_name: "", msgs_per_cycle: 10 });
  const [savingInst, setSavingInst] = useState(false);

  // ── per-instance connection state
  const [instanceStatus, setInstanceStatus] = useState<Record<string, string>>({});
  const [instanceQr, setInstanceQr] = useState<Record<string, string | null>>({});
  const [instanceLoading, setInstanceLoading] = useState<Record<string, string | null>>({});
  // instanceLoading[id] = "qr" | "status" | "logout" | null

  // ── campaigns state
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [campForm, setCampForm] = useState({
    title: "",
    service_slug: "" as string,
    message_template: DEFAULT_TEMPLATE,
    start_time: "09:00",
    interval_seconds: 30,
  });
  const [savingCamp, setSavingCamp] = useState(false);
  const [sendingCampId, setSendingCampId] = useState<string | null>(null);
  const [expandedInstances, setExpandedInstances] = useState(true);
  const [campaignReportOpen, setCampaignReportOpen] = useState<Record<string, boolean>>({});
  const [campaignReportLoading, setCampaignReportLoading] = useState<Record<string, boolean>>({});
  const [campaignReports, setCampaignReports] = useState<Record<string, CampaignReportRow[]>>({});

  /* ───────── call evolution-instance edge function ───────── */
  const callInstanceAction = useCallback(async (instanceId: string, action: string) => {
    const { data, error } = await supabase.functions.invoke("evolution-instance", {
      body: { instance_id: instanceId, action },
    });
    if (error) throw new Error(error.message || "Erro na chamada");
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  /* ───────── fetch ───────── */
  const checkAllStatuses = useCallback(async (insts: EvolutionInstance[]) => {
    if (insts.length === 0) return;

    await Promise.all(
      insts.map(async (inst) => {
        try {
          const data = await callInstanceAction(inst.id, "check_status");
          const state = data?.instance?.state || data?.state || "unknown";
          setInstanceStatus((p) => ({ ...p, [inst.id]: state }));
        } catch {
          setInstanceStatus((p) => ({ ...p, [inst.id]: "unknown" }));
        }
      })
    );
  }, [callInstanceAction]);

  const fetchInstances = useCallback(async () => {
    setLoadingInstances(true);

    const { data: existingInstances, error: listError } = await supabase
      .from("evolution_instances")
      .select("*")
      .order("sort_order");

    if (listError) {
      setLoadingInstances(false);
      toast({ title: "Erro ao carregar instâncias", description: listError.message, variant: "destructive" });
      return;
    }

    let finalInstances = (existingInstances || []) as EvolutionInstance[];

    // Importa automaticamente a instância principal já configurada no módulo antigo
    if (finalInstances.length === 0) {
      const { data: legacyRows } = await supabase
        .from("payment_settings")
        .select("key, value")
        .in("key", ["evolution_api_url", "evolution_api_key", "evolution_instance_name", "evolution_enabled"]);

      const legacyMap: Record<string, string> = {};
      (legacyRows || []).forEach((row: { key: string; value: string }) => {
        legacyMap[row.key] = row.value;
      });

      const legacyUrl = (legacyMap.evolution_api_url || "").trim().replace(/\/+$/, "");
      const legacyKey = (legacyMap.evolution_api_key || "").trim();
      const legacyName = (legacyMap.evolution_instance_name || "").trim();

      if (legacyUrl && legacyKey && legacyName) {
        const { error: importError } = await supabase.from("evolution_instances").insert({
          name: "Instância Principal",
          api_url: legacyUrl,
          api_key: legacyKey,
          instance_name: legacyName,
          is_active: legacyMap.evolution_enabled !== "false",
          sort_order: 0,
          msgs_per_cycle: 10,
        });

        if (!importError) {
          const { data: importedInstances } = await supabase
            .from("evolution_instances")
            .select("*")
            .order("sort_order");

          finalInstances = (importedInstances || []) as EvolutionInstance[];
          toast({ title: "Instância conectada encontrada", description: "A instância principal já existente foi carregada automaticamente." });
        }
      }
    }

    setInstances(finalInstances);
    await checkAllStatuses(finalInstances);
    setLoadingInstances(false);
  }, [checkAllStatuses, toast]);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from("promo_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCampaigns(data as PromoCampaign[]);
    setLoadingCampaigns(false);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("slug, title")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setServices(data);
  }, []);

  useEffect(() => {
    fetchInstances();
    fetchCampaigns();
    fetchServices();
  }, [fetchInstances, fetchCampaigns, fetchServices]);

  /* ───────── instance connection actions ───────── */
  const handleInstanceConnect = async (instId: string) => {
    setInstanceLoading(p => ({ ...p, [instId]: "qr" }));
    setInstanceQr(p => ({ ...p, [instId]: null }));
    try {
      await callInstanceAction(instId, "create_instance");
      const data = await callInstanceAction(instId, "get_qrcode");
      if (data.base64) {
        setInstanceQr(p => ({ ...p, [instId]: data.base64 }));
      } else if (data.code) {
        setInstanceQr(p => ({ ...p, [instId]: data.code }));
      } else {
        toast({ title: "QR Code não disponível", description: "A instância pode já estar conectada. Verifique o status.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar QR Code", description: e.message, variant: "destructive" });
    }
    setInstanceLoading(p => ({ ...p, [instId]: null }));
  };

  const handleInstanceCheckStatus = async (instId: string) => {
    setInstanceLoading(p => ({ ...p, [instId]: "status" }));
    try {
      const data = await callInstanceAction(instId, "check_status");
      const state = data?.instance?.state || data?.state || "unknown";
      setInstanceStatus(p => ({ ...p, [instId]: state }));
      toast({
        title: "Status da conexão",
        description: state === "open" ? "✅ Conectado e funcionando!" : `Status atual: ${state}`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao verificar status", description: e.message, variant: "destructive" });
    }
    setInstanceLoading(p => ({ ...p, [instId]: null }));
  };

  const handleInstanceLogout = async (instId: string) => {
    setInstanceLoading(p => ({ ...p, [instId]: "logout" }));
    try {
      await callInstanceAction(instId, "logout");
      setInstanceStatus(p => ({ ...p, [instId]: "close" }));
      setInstanceQr(p => ({ ...p, [instId]: null }));
      toast({ title: "Desconectado", description: "Instância desconectada do WhatsApp." });
    } catch (e: any) {
      toast({ title: "Erro ao desconectar", description: e.message, variant: "destructive" });
    }
    setInstanceLoading(p => ({ ...p, [instId]: null }));
  };

  /* ───────── instance CRUD ───────── */
  const openNewInstance = () => {
    setEditingInstance(null);
    setInstForm({ name: "", api_url: "", api_key: "", instance_name: "", msgs_per_cycle: 10 });
    setInstanceFormOpen(true);
  };

  const openEditInstance = (inst: EvolutionInstance) => {
    setEditingInstance(inst);
    setInstForm({
      name: inst.name,
      api_url: inst.api_url,
      api_key: inst.api_key,
      instance_name: inst.instance_name,
      msgs_per_cycle: inst.msgs_per_cycle,
    });
    setInstanceFormOpen(true);
  };

  const saveInstance = async () => {
    if (!instForm.name.trim() || !instForm.api_url.trim() || !instForm.api_key.trim() || !instForm.instance_name.trim()) {
      toast({ title: "Preencha todos os campos da instância", variant: "destructive" });
      return;
    }
    setSavingInst(true);
    const payload = {
      name: instForm.name.trim(),
      api_url: instForm.api_url.trim().replace(/\/+$/, ""),
      api_key: instForm.api_key.trim(),
      instance_name: instForm.instance_name.trim(),
      msgs_per_cycle: Math.max(1, instForm.msgs_per_cycle),
    };

    if (editingInstance) {
      await supabase.from("evolution_instances").update(payload).eq("id", editingInstance.id);
    } else {
      const maxOrder = instances.length > 0 ? Math.max(...instances.map(i => i.sort_order)) + 1 : 0;
      await supabase.from("evolution_instances").insert({ ...payload, sort_order: maxOrder });
    }

    toast({ title: editingInstance ? "Instância atualizada" : "Instância criada" });
    setInstanceFormOpen(false);
    setSavingInst(false);
    fetchInstances();
  };

  const toggleInstance = async (id: string, active: boolean) => {
    await supabase.from("evolution_instances").update({ is_active: active }).eq("id", id);
    fetchInstances();
  };

  const deleteInstance = async (id: string) => {
    await supabase.from("evolution_instances").delete().eq("id", id);
    toast({ title: "Instância removida" });
    fetchInstances();
  };

  /* ───────── campaign CRUD ───────── */
  const openNewCampaign = () => {
    setCampForm({
      title: "",
      service_slug: "",
      message_template: DEFAULT_TEMPLATE,
      start_time: "09:00",
      interval_seconds: 30,
    });
    setCampaignFormOpen(true);
  };

  const saveCampaign = async () => {
    if (!campForm.title.trim() || !campForm.message_template.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    setSavingCamp(true);
    await supabase.from("promo_campaigns").insert({
      title: campForm.title.trim(),
      service_slug: campForm.service_slug || null,
      message_template: campForm.message_template,
      start_time: campForm.start_time,
      interval_seconds: Math.max(5, campForm.interval_seconds),
    });
    toast({ title: "Campanha criada com sucesso!" });
    setCampaignFormOpen(false);
    setSavingCamp(false);
    fetchCampaigns();
  };

  const deleteCampaign = async (id: string) => {
    await supabase.from("promo_campaigns").delete().eq("id", id);
    toast({ title: "Campanha removida" });
    fetchCampaigns();
  };

  const fetchCampaignReport = useCallback(async (campaignId: string) => {
    setCampaignReportLoading((prev) => ({ ...prev, [campaignId]: true }));

    try {
      const { data: sends, error: sendsError } = await supabase
        .from("promo_sends")
        .select("id, user_id, phone, status, sent_at, created_at, error_message, instance_id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .range(0, 4999);

      if (sendsError) throw sendsError;

      const safeSends = sends || [];
      const userIds = Array.from(new Set(safeSends.map((row) => row.user_id).filter(Boolean)));
      const instanceIds = Array.from(new Set(safeSends.map((row) => row.instance_id).filter(Boolean))) as string[];

      const [profilesRes, instancesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
        instanceIds.length > 0
          ? supabase.from("evolution_instances").select("id, name, instance_name").in("id", instanceIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (instancesRes.error) throw instancesRes.error;

      const profileMap = new Map(
        (profilesRes.data || []).map((p: { user_id: string; full_name: string; phone: string }) => [p.user_id, p])
      );
      const instanceMap = new Map(
        (instancesRes.data || []).map((i: { id: string; name: string; instance_name: string }) => [i.id, i])
      );

      const reportRows: CampaignReportRow[] = safeSends.map((row) => {
        const profile = profileMap.get(row.user_id);
        const inst = row.instance_id ? instanceMap.get(row.instance_id) : null;

        return {
          ...row,
          recipient_name: profile?.full_name || "Cliente sem nome",
          phone: row.phone || profile?.phone || "-",
          instance_label: inst ? `${inst.name} (${inst.instance_name})` : "-",
        };
      });

      setCampaignReports((prev) => ({ ...prev, [campaignId]: reportRows }));
    } catch (err: any) {
      toast({ title: "Erro ao carregar relatório", description: err.message, variant: "destructive" });
    } finally {
      setCampaignReportLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  }, [toast]);

  const toggleCampaignReport = async (campaignId: string) => {
    const willOpen = !campaignReportOpen[campaignId];
    setCampaignReportOpen((prev) => ({ ...prev, [campaignId]: willOpen }));

    if (willOpen && !campaignReports[campaignId]) {
      await fetchCampaignReport(campaignId);
    }
  };

  /* ───────── send campaign ───────── */
  const sendCampaign = async (campaign: PromoCampaign) => {
    const activeInstances = instances.filter(i => i.is_active);
    if (activeInstances.length === 0) {
      toast({ title: "Nenhuma instância ativa", description: "Cadastre e ative ao menos uma instância Evolution.", variant: "destructive" });
      return;
    }
    setSendingCampId(campaign.id);
    try {
      const { data, error } = await supabase.functions.invoke("promo-broadcast", {
        body: { campaign_id: campaign.id },
      });
      if (error) throw error;
      toast({
        title: "Disparo concluído!",
        description: `${data?.sent || 0} enviadas · ${data?.failed || 0} falhas.`,
      });
      await fetchCampaigns();
      setCampaignReportOpen((prev) => ({ ...prev, [campaign.id]: true }));
      await fetchCampaignReport(campaign.id);
    } catch (err: any) {
      toast({ title: "Erro ao disparar", description: err.message, variant: "destructive" });
    } finally {
      setSendingCampId(null);
    }
  };

  /* ───────── insert dynamic var ───────── */
  const insertVar = (varKey: string) => {
    setCampForm(prev => ({
      ...prev,
      message_template: prev.message_template + varKey,
    }));
  };

  /* ───────── helpers ───────── */
  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      sending: { label: "Enviando…", variant: "default" },
      completed: { label: "Concluída", variant: "outline" },
      failed: { label: "Erro", variant: "destructive" },
    };
    const s = map[status] || map.draft;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const connStatusIcon = (instId: string) => {
    const st = instanceStatus[instId];
    if (st === "open") return <Wifi className="w-4 h-4 text-emerald-500" />;
    if (st === "close") return <WifiOff className="w-4 h-4 text-destructive" />;
    return null;
  };

  const reportStatusBadge = (status: string) => {
    if (status === "sent") return <Badge variant="outline">Enviada</Badge>;
    if (status === "failed") return <Badge variant="destructive">Falha</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const connectedInstancesCount = Object.values(instanceStatus).filter((st) => st === "open").length;
  const loading = loadingInstances || loadingCampaigns;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── INSTANCES SECTION ─── */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setExpandedInstances(!expandedInstances)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Server className="w-5 h-5 text-primary" />
              Instâncias Evolution API
              <Badge variant="outline" className="ml-2">{instances.length}</Badge>
              <Badge variant={connectedInstancesCount > 0 ? "default" : "secondary"}>
                {connectedInstancesCount} conectada{connectedInstancesCount === 1 ? "" : "s"}
              </Badge>
            </CardTitle>
            {expandedInstances ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </CardHeader>
        <AnimatePresence>
          {expandedInstances && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cadastre várias instâncias. O sistema rotaciona entre elas durante o envio, respeitando o limite de mensagens por ciclo de cada uma.
                </p>

                {instances.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Nenhuma instância cadastrada</p>
                  </div>
                )}

                <div className="grid gap-4">
                  {instances.map((inst, idx) => {
                    const isLoadingQr = instanceLoading[inst.id] === "qr";
                    const isLoadingStatus = instanceLoading[inst.id] === "status";
                    const isLoadingLogout = instanceLoading[inst.id] === "logout";
                    const qr = instanceQr[inst.id];
                    const connStatus = instanceStatus[inst.id];

                    return (
                      <div
                        key={inst.id}
                        className="p-4 rounded-xl border border-border bg-card space-y-3"
                      >
                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{inst.name}</p>
                                {connStatusIcon(inst.id)}
                                {connStatus === "open" && <span className="text-[10px] text-emerald-500 font-medium">Conectado</span>}
                                {connStatus === "close" && <span className="text-[10px] text-destructive font-medium">Desconectado</span>}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{inst.instance_name} · {inst.msgs_per_cycle} msgs/ciclo</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={inst.is_active}
                                onCheckedChange={(v) => toggleInstance(inst.id, v)}
                              />
                              <span className="text-xs text-muted-foreground">{inst.is_active ? "Ativa" : "Inativa"}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => openEditInstance(inst)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInstance(inst.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Connection controls */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 flex-1"
                            disabled={isLoadingQr}
                            onClick={() => handleInstanceConnect(inst.id)}
                          >
                            {isLoadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                            {isLoadingQr ? "Gerando..." : "Gerar QR Code"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 flex-1"
                            disabled={isLoadingStatus}
                            onClick={() => handleInstanceCheckStatus(inst.id)}
                          >
                            {isLoadingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Verificar Status
                          </Button>
                          {connStatus === "open" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-2 flex-1"
                              disabled={isLoadingLogout}
                              onClick={() => handleInstanceLogout(inst.id)}
                            >
                              {isLoadingLogout ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                              Desconectar
                            </Button>
                          )}
                        </div>

                        {/* QR Code display */}
                        <AnimatePresence>
                          {qr && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex flex-col items-center gap-2 py-3"
                            >
                              <p className="text-xs text-muted-foreground">Escaneie o QR Code com o WhatsApp:</p>
                              <div className="bg-background p-3 rounded-xl border border-border inline-block">
                                {qr.startsWith("data:") || qr.length > 200 ? (
                                  <img
                                    src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
                                    alt="QR Code"
                                    className="w-48 h-48"
                                  />
                                ) : (
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`}
                                    alt="QR Code"
                                    className="w-48 h-48"
                                  />
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs"
                                onClick={() => setInstanceQr(p => ({ ...p, [inst.id]: null }))}
                              >
                                Fechar QR Code
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <Button onClick={openNewInstance} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Instância
                </Button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ─── CAMPAIGNS SECTION ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Megaphone className="w-5 h-5 text-primary" />
              Campanhas de Promoção
            </CardTitle>
            {!campaignFormOpen && (
              <Button onClick={openNewCampaign} className="gap-2" size="sm">
                <Plus className="w-4 h-4" />
                Nova Campanha
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ─── INLINE CAMPAIGN FORM ─── */}
          <AnimatePresence>
            {campaignFormOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 md:p-6 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-4">
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-primary" />
                    Nova Campanha de Promoção
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Título da Campanha</Label>
                      <Input
                        value={campForm.title}
                        onChange={(e) => setCampForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Ex: Promoção de Verão"
                        maxLength={100}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Serviço / Procedimento</Label>
                      <Select value={campForm.service_slug} onValueChange={(v) => setCampForm(p => ({ ...p, service_slug: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os serviços" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os serviços (genérico)</SelectItem>
                          {services.map(s => (
                            <SelectItem key={s.slug} value={s.slug}>{s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">A variável {"{servico}"} será preenchida com o procedimento selecionado.</p>
                    </div>

                    <div className="md:col-span-2">
                      <Label className="flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary" />
                        Mensagem da Promoção
                      </Label>
                      <Textarea
                        value={campForm.message_template}
                        onChange={(e) => setCampForm(p => ({ ...p, message_template: e.target.value }))}
                        rows={6}
                        className="font-mono text-sm"
                        maxLength={2000}
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {DYNAMIC_VARS.map(v => (
                          <Button
                            key={v.key}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => insertVar(v.key)}
                          >
                            <Plus className="w-3 h-3" />
                            {v.key}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Clique para inserir variáveis dinâmicas na mensagem.</p>
                    </div>

                    <div>
                      <Label className="flex items-center gap-1"><Clock className="w-4 h-4" /> Hora de Início</Label>
                      <Input
                        type="time"
                        value={campForm.start_time}
                        onChange={(e) => setCampForm(p => ({ ...p, start_time: e.target.value }))}
                        className="text-lg font-semibold text-center h-12"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Intervalo (segundos)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={600}
                        value={campForm.interval_seconds}
                        onChange={(e) => setCampForm(p => ({ ...p, interval_seconds: parseInt(e.target.value) || 30 }))}
                        className="text-2xl font-bold text-center h-14"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-1">entre cada mensagem</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Como funciona o envio:</p>
                    <p>1. As mensagens são enviadas para todos os clientes cadastrados com telefone.</p>
                    <p>2. O sistema usa a 1ª instância ativa até atingir o limite de msgs/ciclo.</p>
                    <p>3. Então pula automaticamente para a próxima instância e assim por diante.</p>
                    <p>4. Ao terminar todas, reinicia o ciclo na 1ª instância.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={saveCampaign} disabled={savingCamp} className="gap-2 flex-1 sm:flex-none">
                      {savingCamp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Criar Campanha
                    </Button>
                    <Button variant="outline" onClick={() => setCampaignFormOpen(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {campaigns.length === 0 && !campaignFormOpen && (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma campanha criada</p>
            </div>
          )}

          {campaigns.map((camp) => (
            <div key={camp.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-sm">{camp.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Início: {camp.start_time} · Intervalo: {camp.interval_seconds}s
                    {camp.service_slug && ` · Serviço: ${services.find(s => s.slug === camp.service_slug)?.title || camp.service_slug}`}
                  </p>
                </div>
                {statusBadge(camp.status)}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                {camp.message_template}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {camp.total_sent} enviadas</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {camp.total_failed} falhas</span>
                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {camp.total_target} alvo</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={sendingCampId === camp.id || camp.status === "sending"}
                  onClick={() => sendCampaign(camp)}
                >
                  {sendingCampId === camp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {camp.status === "completed" ? "Reenviar" : "Disparar"}
                </Button>
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => deleteCampaign(camp.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── INSTANCE FORM DIALOG ─── */}
      <Dialog open={instanceFormOpen} onOpenChange={setInstanceFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingInstance ? "Editar Instância" : "Nova Instância Evolution"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Instância (identificação)</Label>
              <Input
                value={instForm.name}
                onChange={(e) => setInstForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Instância 1"
                maxLength={50}
              />
            </div>
            <div>
              <Label>URL da API Evolution</Label>
              <Input
                value={instForm.api_url}
                onChange={(e) => setInstForm(p => ({ ...p, api_url: e.target.value }))}
                placeholder="https://sua-api.com"
                maxLength={500}
              />
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={instForm.api_key}
                onChange={(e) => setInstForm(p => ({ ...p, api_key: e.target.value }))}
                placeholder="Chave da API"
                maxLength={500}
              />
            </div>
            <div>
              <Label>Nome da Instância Evolution</Label>
              <Input
                value={instForm.instance_name}
                onChange={(e) => setInstForm(p => ({ ...p, instance_name: e.target.value }))}
                placeholder="Ex: rosa-de-lis-1"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Mensagens por Ciclo (antes de pular para próxima instância)</Label>
              <Input
                type="number"
                min={1}
                max={500}
                className="text-2xl font-bold text-center h-14"
                value={instForm.msgs_per_cycle}
                onChange={(e) => setInstForm(p => ({ ...p, msgs_per_cycle: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstanceFormOpen(false)}>Cancelar</Button>
            <Button onClick={saveInstance} disabled={savingInst} className="gap-2">
              {savingInst ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromoBroadcast;
