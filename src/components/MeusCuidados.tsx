import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CalendarPlus, Flower2, HeartHandshake, Lightbulb, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnlineBooking } from "@/hooks/useOnlineBooking";
import { PETALS_PER_REWARD, petalProgress, careTipsFor, calendarUrl, dailyTip, bookingAction } from "@/lib/clientCare";

type Apt = { id: string; service_title: string; service_slug: string; appointment_date: string; appointment_time: string; status: string; room_number: number | null };

const fmt = (d: string) => d.split("-").reverse().join("/");

export default function MeusCuidados({ userId, onReward, readOnly }: { userId: string; onReward?: () => void; readOnly?: boolean }) {
  const [next, setNext] = useState<Apt | null>(null);
  const [last, setLast] = useState<Apt | null>(null);
  const [completed, setCompleted] = useState(0);
  const [claimed, setClaimed] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const today = new Date().toLocaleDateString("en-CA");
    const [n, l, c, f] = await Promise.all([
      supabase.from("appointments").select("id,service_title,service_slug,appointment_date,appointment_time,status,room_number").eq("user_id", userId).in("status", ["confirmed", "pending"]).gte("appointment_date", today).order("appointment_date").order("appointment_time").limit(1),
      supabase.from("appointments").select("id,service_title,service_slug,appointment_date,appointment_time,status,room_number").eq("user_id", userId).eq("status", "completed").order("appointment_date", { ascending: false }).limit(1),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
      supabase.from("coupons").select("id", { count: "exact", head: true }).eq("user_id", userId).like("code", "FID-%"),
    ]);
    setNext((n.data?.[0] as Apt) ?? null);
    setLast((l.data?.[0] as Apt) ?? null);
    setCompleted(c.count ?? 0);
    setClaimed(f.count ?? 0);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const navigate = useNavigate();
  const { isEnabled, whatsappNumber, getWhatsAppUrl } = useOnlineBooking();

  const goToServices = useCallback(() => {
    if (window.location.pathname !== "/") navigate("/");
    let tries = 0;
    const reveal = () => {
      const el = document.getElementById("servicos");
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      if (tries++ < 50) setTimeout(reveal, 100);
    };
    reveal();
  }, [navigate]);

  const handleBook = () => {
    if (bookingAction(isEnabled, whatsappNumber) === "whatsapp") {
      window.open(getWhatsAppUrl(next?.service_title), "_blank", "noopener,noreferrer");
      return;
    }
    goToServices();
  };

  const { filled, rewardsEarned } = petalProgress(completed);
  const canClaim = rewardsEarned > claimed;

  const claim = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_loyalty_reward" as never);
    setBusy(false);
    const res = data as { ok?: boolean; code?: string } | null;
    if (error || !res?.ok) { toast.error("Não foi possível resgatar agora."); return; }
    toast.success(`Mimo liberado! Cupom ${res.code} com 15% de desconto.`);
    await load();
    onReward?.();
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><h2 className="font-heading text-lg font-bold text-foreground">Meus Cuidados</h2></div>

      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-1"><Lightbulb className="w-4 h-4 text-primary" /><p className="font-body text-xs uppercase tracking-wider text-primary font-semibold">Dica do dia</p></div>
        <p className="font-body text-sm text-foreground">{dailyTip(userId, last || next ? `${(last || next)!.service_slug} ${(last || next)!.service_title}` : "")}</p>
        <p className="font-body text-xs text-muted-foreground mt-2">Volte amanhã para uma nova dica ✨</p>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <p className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1">Próximo atendimento</p>
        {next ? (
          <>
            <p className="font-heading text-base font-bold text-foreground">{next.service_title}</p>
            <p className="font-body text-sm text-muted-foreground">{fmt(next.appointment_date)} às {next.appointment_time}{next.room_number ? ` · Sala ${next.room_number}` : ""}</p>
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
              <a href={calendarUrl(next.service_title, next.appointment_date, next.appointment_time)} target="_blank" rel="noreferrer"><CalendarPlus className="w-4 h-4 mr-1" />Salvar na agenda do celular</a>
            </Button>
          </>
        ) : <p className="font-body text-sm text-muted-foreground">Nenhum horário marcado. Que tal agendar seu próximo momento de cuidado?</p>}
        <Button size="sm" className="mt-3 rounded-full ml-0 sm:ml-2" onClick={handleBook}>
          <CalendarCheck className="w-4 h-4 mr-1" />{next ? "Marcar outro atendimento" : "Agendar agora"}
        </Button>
      </div>

      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-heading text-base font-bold text-foreground">Pétalas Rosa de Lis</p>
          <span className="font-body text-sm font-semibold text-primary">{filled}/{PETALS_PER_REWARD}</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2" aria-label={`${filled} de ${PETALS_PER_REWARD} pétalas`}>
          {Array.from({ length: PETALS_PER_REWARD }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-full flex items-center justify-center ${i < filled || canClaim ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground/40"}`}>
              <Flower2 className="w-4 h-4" />
            </div>
          ))}
        </div>
        <p className="font-body text-xs text-muted-foreground mt-3">Cada atendimento finalizado vale 1 pétala. Ao completar {PETALS_PER_REWARD}, você ganha um mimo de 15% de desconto.</p>
        {canClaim && !readOnly && <Button onClick={claim} disabled={busy} className="mt-3 rounded-full">Resgatar meu mimo</Button>}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center gap-2 mb-2"><HeartHandshake className="w-4 h-4 text-primary" /><p className="font-heading text-base font-bold text-foreground">Dicas pós-atendimento{(last || next) ? `: ${(last || next)!.service_title}` : ""}</p></div>
        <p className="font-body text-xs text-muted-foreground mb-2">{last ? `Seu último atendimento foi em ${fmt(last.appointment_date)}` : next ? "Para depois do seu próximo atendimento" : "Cuidados gerais para manter seus resultados"}</p>
        <ul className="list-disc pl-5 space-y-1 font-body text-sm text-foreground">
          {careTipsFor(last || next ? `${(last || next)!.service_slug} ${(last || next)!.service_title}` : "").map((t) => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </div>
  );
}
