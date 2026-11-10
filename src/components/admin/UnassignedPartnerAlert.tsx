import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Apt { id: string; service_title: string; appointment_date: string; appointment_time: string }

const playAlert = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* som bloqueado pelo navegador */ }
};

const fmtDate = (d: string) => d.split("-").reverse().join("/");

export default function UnassignedPartnerAlert({ onOpenAgenda }: { onOpenAgenda: () => void }) {
  const [items, setItems] = useState<Apt[]>([]);
  const [hidden, setHidden] = useState(false);
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const { data } = await supabase
      .from("appointments")
      .select("id, service_title, appointment_date, appointment_time")
      .is("partner_id", null)
      .in("status", ["confirmed", "pending"])
      .gte("appointment_date", iso)
      .order("appointment_date")
      .order("appointment_time")
      .limit(50);
    const list = (data || []) as Apt[];
    const ids = new Set(list.map((a) => a.id));
    if (known.current && list.some((a) => !known.current!.has(a.id))) {
      playAlert();
      setHidden(false);
    } else if (!known.current && list.length) {
      playAlert();
    }
    known.current = ids;
    setItems(list);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const ch = supabase
      .channel("unassigned-partner-alert")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, [load]);

  if (!items.length || hidden) return null;

  return (
    <div role="alert" className="mb-4 rounded-xl border-2 border-destructive bg-destructive/10 p-3 md:p-4">
      <div className="flex items-start gap-3">
        <BellRing className="h-6 w-6 text-destructive shrink-0 animate-bounce" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-destructive">
            {items.length === 1 ? "1 agendamento sem profissional" : `${items.length} agendamentos sem profissional`}
          </p>
          <ul className="mt-1 text-sm text-foreground space-y-0.5">
            {items.slice(0, 5).map((a) => (
              <li key={a.id} className="truncate">
                {fmtDate(a.appointment_date)} às {a.appointment_time.slice(0, 5)} — {a.service_title}
              </li>
            ))}
            {items.length > 5 && <li className="text-muted-foreground">e mais {items.length - 5}…</li>}
          </ul>
          <Button size="sm" variant="destructive" className="mt-2" onClick={onOpenAgenda}>
            Atribuir profissional na Agenda
          </Button>
        </div>
        <button aria-label="Ocultar aviso" onClick={() => setHidden(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
