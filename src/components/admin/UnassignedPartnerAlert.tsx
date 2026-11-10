import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

interface Apt { id: string; service_title: string; appointment_date: string; appointment_time: string }

const REPEAT_MS = 5 * 60 * 1000;
let audioCtx: AudioContext | null = null;
const getCtx = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
};

const playAlert = () => {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      const s = ctx.currentTime + t;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.35, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(s);
      o.stop(s + 0.27);
    });
  } catch { /* som bloqueado */ }
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (d: string) => d.split("-").reverse().join("/");

export default function UnassignedPartnerAlert() {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();
  const [items, setItems] = useState<Apt[]>([]);
  const [hidden, setHidden] = useState(false);
  const known = useRef<Set<string>>(new Set());
  const hasItems = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("id, service_title, appointment_date, appointment_time")
      .is("partner_id", null)
      .in("status", ["confirmed", "pending"])
      .gte("appointment_date", todayIso())
      .order("appointment_date")
      .order("appointment_time")
      .limit(50);
    if (error) { console.error("UnassignedPartnerAlert", error); return; }
    const list = (data || []) as Apt[];
    const isNew = list.some((a) => !known.current.has(a.id));
    known.current = new Set(list.map((a) => a.id));
    hasItems.current = list.length > 0;
    setItems(list);
    if (isNew && list.length) { setHidden(false); playAlert(); }
  }, []);

  useEffect(() => {
    if (loading || !isAdmin) return;
    // desbloqueia o som no primeiro toque/clique
    const unlock = () => { try { getCtx().resume(); } catch { /* */ } };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    load();
    const poll = setInterval(load, 60000);
    const ring = setInterval(() => { if (hasItems.current) playAlert(); }, REPEAT_MS);
    const ch = supabase
      .channel("unassigned-partner-alert")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => {
      clearInterval(poll); clearInterval(ring); supabase.removeChannel(ch);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [isAdmin, loading, load]);

  if (!isAdmin || !items.length || hidden) return null;

  return (
    <div role="alert" className="fixed top-16 right-3 left-3 md:left-auto md:w-96 z-[9998] rounded-xl border-2 border-destructive bg-background p-3 md:p-4 shadow-lg">
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
          <Button size="sm" variant="destructive" className="mt-2" onClick={() => { navigate("/admin?tab=agenda", { state: { openTab: "agenda", t: Date.now() } }); window.dispatchEvent(new CustomEvent("admin-open-tab", { detail: "agenda" })); }}>
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
