import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Save, Send, Pencil, Server, Megaphone, Clock,
  Hash, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw
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

  /* ───────── fetch ───────── */
  const fetchInstances = useCallback(async () => {
    const { data } = await supabase
      .from("evolution_instances")
      .select("*")
      .order("sort_order");
    if (data) setInstances(data as EvolutionInstance[]);
    setLoadingInstances(false);
  }, []);

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
        title: "Disparo iniciado!",
        description: `${data?.queued || 0} mensagens enfileiradas para envio.`,
      });
      fetchCampaigns();
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

                <div className="grid gap-3">
                  {instances.map((inst, idx) => (
                    <div
                      key={inst.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-border bg-card"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{inst.name}</p>
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
                  ))}
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
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> {camp.total_sent} enviadas</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> {camp.total_failed} falhas</span>
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
