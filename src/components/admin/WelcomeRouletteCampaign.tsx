import { useEffect, useState } from "react";
import { Send, Users, Loader2, ShieldCheck, RefreshCw, CalendarClock, X, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_MESSAGE =
  "Olá {nome}! 🌸\n\nVocê ainda não girou a *Roleta de Boas-Vindas* da _{empresa}_ 🎁\n\nSão prêmios como *descontos exclusivos* e até *sessões grátis* em procedimentos estéticos — e você tem direito a *1 giro gratuito*.\n\nGire agora e descubra seu prêmio:\n👉 {link_roleta}\n\nDepois é só falar com a gente para agendar 💖\n👉 {link_agendar}\n\n_{empresa}_";

const VARS = [
  { key: "{nome}", label: "Nome do cliente" },
  { key: "{empresa}", label: "Nome da empresa" },
  { key: "{link_roleta}", label: "Link da roleta" },
  { key: "{link_agendar}", label: "Link p/ agendar no WhatsApp" },
];

const WelcomeRouletteCampaign = () => {
  const [eligible, setEligible] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [intervalMin, setIntervalMin] = useState(25);
  const [intervalMax, setIntervalMax] = useState(60);
  const [batchSize, setBatchSize] = useState(30);
  const [batchPause, setBatchPause] = useState(10);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const countEligible = async () => {
    setCounting(true);
    try {
      const [{ data: profiles }, { data: coupons }, { data: unsubs }] = await Promise.all([
        supabase.from("profiles").select("user_id, phone").limit(5000),
        supabase.from("coupons").select("user_id").like("code", "BV-%"),
        supabase.from("promo_unsubscribes").select("phone"),
      ]);
      const spun = new Set((coupons || []).map((c: any) => c.user_id));
      const unsubSet = new Set((unsubs || []).map((u: any) => (u.phone || "").replace(/\D/g, "")));
      const count = (profiles || []).filter((p: any) => {
        const digits = (p.phone || "").replace(/\D/g, "");
        if (digits.length < 10) return false;
        const full = digits.startsWith("55") ? digits : `55${digits}`;
        return !spun.has(p.user_id) && !unsubSet.has(full);
      }).length;
      setEligible(count);
    } finally {
      setCounting(false);
    }
  };

  useEffect(() => {
    countEligible();
  }, []);

  const createCampaign = async (status: "draft" | "scheduled", scheduledAt: string | null) => {
    const { data: camp, error: campErr } = await supabase
      .from("promo_campaigns" as any)
      .insert({
        title: `Roleta de Boas-Vindas — ${new Date().toLocaleDateString("pt-BR")}`,
        message_template: message,
        start_time: (scheduledAt ? new Date(scheduledAt) : new Date()).toTimeString().slice(0, 5),
        interval_seconds: intervalMin,
        status,
        scheduled_at: scheduledAt,
        audience_filter: {
          type: "no_welcome_roulette",
          interval_min: intervalMin,
          interval_max: intervalMax,
          batch_size: batchSize,
          batch_pause_minutes: batchPause,
        },
      } as any)
      .select("id")
      .single();
    if (campErr || !camp) throw campErr || new Error("Falha ao criar campanha");
    return camp as any;
  };

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from("promo_campaigns" as any)
      .select("id, title, status, scheduled_at, started_at, finished_at, total_sent, total_failed, total_target, last_error, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setCampaigns((data as any[]) || []);
  };

  useEffect(() => {
    loadCampaigns();
    const t = setInterval(loadCampaigns, 10000);
    return () => clearInterval(t);
  }, []);

  const scheduleCampaign = async () => {
    if (!message.trim()) {
      toast.error("Escreva a mensagem da campanha.");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error("Escolha a data e o horário de início.");
      return;
    }
    const when = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (isNaN(when.getTime())) {
      toast.error("Data ou horário inválido.");
      return;
    }
    if (when.getTime() < Date.now() - 60000) {
      toast.error("Escolha uma data/horário no futuro.");
      return;
    }
    setScheduling(true);
    try {
      await createCampaign("scheduled", when.toISOString());
      toast.success(`Campanha agendada para ${when.toLocaleString("pt-BR")}.`);
      setScheduleDate("");
      setScheduleTime("");
      loadCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao agendar a campanha.");
    } finally {
      setScheduling(false);
    }
  };

  const cancelScheduled = async (id: string) => {
    if (!confirm("Cancelar esta campanha agendada?")) return;
    const { error } = await supabase
      .from("promo_campaigns" as any)
      .update({ status: "cancelled" } as any)
      .eq("id", id)
      .eq("status", "scheduled");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Agendamento cancelado.");
    loadCampaigns();
  };

  const startCampaign = async () => {
    if (!message.trim()) {
      toast.error("Escreva a mensagem da campanha.");
      return;
    }
    if (intervalMax < intervalMin) {
      toast.error("O intervalo máximo deve ser maior que o mínimo.");
      return;
    }
    if (!confirm(`Iniciar a campanha da Roleta de Boas-Vindas para ${eligible ?? "?"} clientes?`)) return;

    setSending(true);
    setLastResult(null);
    try {
      const camp = await createCampaign("draft", null);

      const { data, error } = await supabase.functions.invoke("promo-broadcast", {
        body: { campaign_id: (camp as any).id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setLastResult({ sent: (data as any)?.sent ?? 0, failed: (data as any)?.failed ?? 0 });
      toast.success(`Campanha finalizada: ${(data as any)?.sent ?? 0} enviadas.`);
      countEligible();
      loadCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao iniciar a campanha.");
    } finally {
      setSending(false);
    }
  };

  const estMinutes = eligible
    ? Math.round(
        (eligible * ((intervalMin + intervalMax) / 2) +
          (batchSize > 0 ? Math.floor(eligible / batchSize) * batchPause * 60 : 0)) / 60
      )
    : 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold text-foreground">Campanha WhatsApp — Roleta de Boas-Vindas</h2>
            <p className="font-body text-xs text-muted-foreground">
              Envia o convite da roleta para clientes cadastrados que ainda não giraram.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-body text-sm font-semibold text-foreground">
              {counting ? "..." : eligible ?? 0} elegíveis
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={countEligible} disabled={counting} title="Recalcular">
            <RefreshCw className={`w-4 h-4 ${counting ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Mensagem da campanha
          </label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={12} className="font-mono text-xs" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setMessage((m) => `${m}${v.key}`)}
                className="text-[11px] px-2 py-1 rounded-full border border-border hover:border-primary hover:text-primary font-body"
                title={v.label}
              >
                {v.key}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            O link de cancelamento (“não quero mais receber”) é adicionado automaticamente ao final de cada mensagem.
          </p>
        </div>

        <div className="rounded-2xl border border-border p-3 md:p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground">Proteção anti-bloqueio</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="font-body text-[11px] text-muted-foreground block mb-1">Intervalo mín. (s)</label>
              <Input type="number" min={5} value={intervalMin} onChange={(e) => setIntervalMin(Math.max(5, Number(e.target.value) || 5))} className="h-9" />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground block mb-1">Intervalo máx. (s)</label>
              <Input type="number" min={5} value={intervalMax} onChange={(e) => setIntervalMax(Math.max(5, Number(e.target.value) || 5))} className="h-9" />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground block mb-1">Msgs por lote</label>
              <Input type="number" min={0} value={batchSize} onChange={(e) => setBatchSize(Math.max(0, Number(e.target.value) || 0))} className="h-9" />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground block mb-1">Pausa do lote (min)</label>
              <Input type="number" min={0} value={batchPause} onChange={(e) => setBatchPause(Math.max(0, Number(e.target.value) || 0))} className="h-9" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            O envio usa intervalo aleatório entre o mínimo e o máximo, pausa longa a cada lote e rodízio automático entre as
            instâncias ativas do WhatsApp. Recomendado: 25–60s, lotes de 30 mensagens com 10 min de pausa.
          </p>
          {eligible ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              ⏱️ Tempo estimado de envio: ~{estMinutes} min para {eligible} clientes.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button onClick={startCampaign} disabled={sending || !eligible} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Enviando campanha..." : "Iniciar campanha"}
          </Button>
          {lastResult && (
            <span className="font-body text-xs text-muted-foreground">
              ✅ {lastResult.sent} enviadas · ❌ {lastResult.failed} falhas
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeRouletteCampaign;
