import { motion, AnimatePresence } from "framer-motion";
import { User, Scissors, X, Phone, MessageCircle, Clock, Handshake, Banknote, CheckCircle2, PlusCircle, CalendarClock, CalendarX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";

interface Profile {
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
}

interface TimelineAppointment {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_time: string;
  status: string;
  user_id: string;
  session_number: number | null;
  notes: string | null;
  partner_id: string | null;
  plan_id: string | null;
  profiles?: Profile | null;
}

interface ClientPlan {
  id: string;
  user_id: string;
  service_slug: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
}

interface PartnerOption {
  id: string;
  full_name: string;
}

interface DayTimelineViewProps {
  appointments: TimelineAppointment[];
  expandedAptId: string | null;
  onSelectAppointment: (id: string) => void;
  clientPlans: ClientPlan[];
  partnerOptions: PartnerOption[];
  allPrices: any[];
  updatingPlan: string | null;
  onConfirmPayment: (apt: TimelineAppointment) => void;
  onComplete: (apt: TimelineAppointment) => void;
  onReschedule: (apt: TimelineAppointment) => void;
  onCancel: (id: string) => void;
  onPartnerAssign: (aptId: string, partnerId: string | null) => void;
  onUpdateSessions: (planId: string, delta: number) => void;
  isRescheduled: (apt: TimelineAppointment) => boolean;
  getAppointmentPrice: (apt: TimelineAppointment, prices: any[]) => string;
  getInitials: (name: string) => string;
}

const PALETTE = [
  { bg: "#d8b4fe", text: "#581c87" },
  { bg: "#93c5fd", text: "#1e3a5f" },
  { bg: "#fcd34d", text: "#713f12" },
  { bg: "#fda4af", text: "#881337" },
  { bg: "#6ee7b7", text: "#064e3b" },
  { bg: "#fdba74", text: "#7c2d12" },
  { bg: "#c4b5fd", text: "#4c1d95" },
  { bg: "#67e8f9", text: "#155e75" },
];

const estimateDuration = (serviceSlug: string): number => {
  const slug = serviceSlug.toLowerCase();
  if (slug.includes("micropigment")) return 120;
  if (slug.includes("sobrancelh")) return 30;
  if (slug.includes("maquiag")) return 60;
  if (slug.includes("drenagem") || slug.includes("massagem")) return 60;
  if (slug.includes("limpeza")) return 90;
  if (slug.includes("peeling")) return 60;
  if (slug.includes("botox") || slug.includes("toxina")) return 45;
  return 60;
};

const START_HOUR = 8;
const END_HOUR = 19;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;
const ROW_HEIGHT = 40;

const timeToSlotIndex = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 2 + Math.floor(m / 30);
};

const formatTimeRange = (startTime: string, durationMin: number) => {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMin;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${startTime} - ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

const DayTimelineView = ({
  appointments,
  expandedAptId,
  onSelectAppointment,
  clientPlans,
  partnerOptions,
  allPrices,
  updatingPlan,
  onConfirmPayment,
  onComplete,
  onReschedule,
  onCancel,
  onPartnerAssign,
  onUpdateSessions,
  isRescheduled: isRescheduledFn,
  getAppointmentPrice,
  getInitials,
}: DayTimelineViewProps) => {
  const isMobile = useIsMobile();
  const colorMap = useMemo(() => {
    const map: Record<string, { bg: string; text: string }> = {};
    const slugs = [...new Set(appointments.map((a) => a.service_slug))];
    slugs.forEach((slug, i) => {
      map[slug] = PALETTE[i % PALETTE.length];
    });
    return map;
  }, [appointments]);

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [appointments]
  );

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const hour = START_HOUR + Math.floor(i / 2);
    const min = (i % 2) * 30;
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  });

  const aptBlocks = sorted.map((apt) => {
    const duration = estimateDuration(apt.service_slug);
    const startSlot = timeToSlotIndex(apt.appointment_time);
    const spanSlots = Math.max(1, Math.ceil(duration / 30));
    return { ...apt, startSlot, spanSlots, duration };
  });

  const columns: typeof aptBlocks[] = [];
  const aptCol = new Map<string, number>();

  for (const block of aptBlocks) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (block.startSlot >= last.startSlot + last.spanSlots) {
        columns[c].push(block);
        aptCol.set(block.id, c);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([block]);
      aptCol.set(block.id, columns.length - 1);
    }
  }

  const totalCols = Math.max(1, columns.length);

  const now = new Date();
  const nowSlot = (now.getHours() - START_HOUR) * 2 + now.getMinutes() / 30;
  const showNowLine = nowSlot >= 0 && nowSlot <= TOTAL_SLOTS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-auto relative"
    >
      <div className="relative" style={{ height: `${TOTAL_SLOTS * ROW_HEIGHT}px` }}>
        {/* Grid rows - narrower time labels on mobile */}
        {slots.map((label, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 flex"
            style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
          >
            <div className={cn("shrink-0 flex items-start justify-end pr-1.5 pt-0.5", isMobile ? "w-[40px]" : "w-[52px]")}>
              <span className={cn(
                "font-body",
                isMobile ? "text-[9px]" : "text-[11px]",
                i % 2 === 0 ? "text-muted-foreground font-medium" : "text-muted-foreground/40"
              )}>
                {label}
              </span>
            </div>
            <div className={cn(
              "flex-1 border-t",
              i % 2 === 0 ? "border-border" : "border-border/30 border-dashed"
            )} />
          </div>
        ))}

        {/* Current time line */}
        {showNowLine && (
          <div
            className={cn("absolute right-0 z-30 flex items-center pointer-events-none", isMobile ? "left-[36px]" : "left-[48px]")}
            style={{ top: `${nowSlot * ROW_HEIGHT}px` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1 shrink-0" />
            <div className="flex-1 h-0.5 bg-destructive" />
          </div>
        )}

        {/* Appointment blocks */}
        {aptBlocks.map((block) => {
          const color = colorMap[block.service_slug] || PALETTE[0];
          const profile = block.profiles;
          const col = aptCol.get(block.id) || 0;
          const colWidth = `calc((100% - 52px) / ${totalCols})`;
          const colLeft = `calc(52px + ${col} * (100% - 52px) / ${totalCols})`;
          const top = block.startSlot * ROW_HEIGHT;
          const height = Math.max(block.spanSlots * ROW_HEIGHT - 2, ROW_HEIGHT - 2);
          const timeRange = formatTimeRange(block.appointment_time, block.duration);
          const isExpanded = expandedAptId === block.id;
          const plan = clientPlans.find((p) => p.user_id === block.user_id && p.service_slug === block.service_slug);
          const progress = plan && plan.total_sessions > 0 ? (plan.completed_sessions / plan.total_sessions) * 100 : 0;
          const isComplete = plan ? plan.completed_sessions >= plan.total_sessions : false;

          return (
            <div key={block.id}>
              {/* Colored block */}
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className={cn(
                  "absolute z-10 rounded-md cursor-pointer transition-all overflow-hidden px-2 py-1.5",
                  isExpanded ? "ring-2 ring-primary shadow-lg" : "hover:brightness-95"
                )}
                style={{
                  top: `${top + 1}px`,
                  left: colLeft,
                  width: colWidth,
                  height: `${height}px`,
                  backgroundColor: color.bg,
                  color: color.text,
                }}
                onClick={() => onSelectAppointment(block.id)}
              >
                <p className="text-[11px] font-bold leading-tight truncate">{timeRange}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                  ) : (
                    <User className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  )}
                  <span className="text-[11px] font-semibold truncate">{profile?.full_name || "Cliente"}</span>
                </div>
                {height > 50 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Scissors className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="text-[10px] font-medium truncate opacity-80">{block.service_title}</span>
                  </div>
                )}
              </motion.div>

              {/* Expanded detail card - positioned right below the block */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.9 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.9 }}
                    className="absolute z-40 bg-card rounded-xl border border-border shadow-xl p-4 space-y-3"
                    style={{
                      top: `${top + height + 6}px`,
                      left: "52px",
                      right: "8px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-sm font-bold text-foreground">{block.service_title}</h3>
                      <button onClick={() => onSelectAppointment(block.id)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Client info */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile?.full_name} className="w-full h-full object-cover" />
                        ) : profile ? (
                          <span className="font-heading text-xs font-bold text-primary">{getInitials(profile.full_name)}</span>
                        ) : (
                          <User className="w-4 h-4 text-primary/50" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-semibold text-foreground truncate">{profile?.full_name || "Cliente"}</p>
                        {profile?.phone && (
                          <p className="font-body text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{profile.phone}
                          </p>
                        )}
                      </div>
                      {profile?.phone && (
                        <div className="flex gap-1.5 shrink-0">
                          <a href={`tel:${profile.phone.replace(/\D/g, "")}`} className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a href={`https://wa.me/55${profile.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${block.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-700"}`}>
                        {block.status === "confirmed" ? "Confirmado" : "Pendente"}
                      </span>
                      {isRescheduledFn(block) && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">Remarcado</span>}
                      {isComplete && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">Plano Completo</span>}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{block.appointment_time}
                      </span>
                      <span className="font-heading text-xs font-bold text-primary">{getAppointmentPrice(block, allPrices)}</span>
                    </div>

                    {/* Plan progress */}
                    {plan && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body text-xs font-semibold text-foreground">{plan.plan_name}</span>
                          <span className="font-heading text-[11px] font-bold text-primary">{plan.completed_sessions}/{plan.total_sessions}</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Partner */}
                    <div className="flex items-center gap-2">
                      <Handshake className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <select
                        value={block.partner_id || ""}
                        onChange={(e) => onPartnerAssign(block.id, e.target.value || null)}
                        className="flex-1 h-7 rounded-lg border border-border bg-background px-2 text-[11px] font-body text-foreground focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Sem parceiro</option>
                        {partnerOptions.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {block.status === "pending" && (
                        <button onClick={() => onConfirmPayment(block)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 border-emerald-400/40 text-emerald-600 bg-emerald-50 hover:bg-emerald-500 hover:text-white transition-all">
                          <Banknote className="w-3.5 h-3.5" />Confirmar PIX
                        </button>
                      )}
                      <button onClick={() => onComplete(block)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground transition-all">
                        <CheckCircle2 className="w-3.5 h-3.5" />Finalizar
                      </button>
                      {plan && (
                        <button
                          onClick={() => { onUpdateSessions(plan.id, 1); onComplete(block); }}
                          disabled={updatingPlan === plan.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-30"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />Sessão Realizada
                        </button>
                      )}
                      <button onClick={() => onReschedule(block)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all">
                        <CalendarClock className="w-3.5 h-3.5" />Remarcar
                      </button>
                      <button onClick={() => onCancel(block.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/20 hover:bg-destructive/5 transition-all">
                        <CalendarX className="w-3.5 h-3.5" />Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* "Hoje" button */}
      <div className="sticky bottom-3 flex justify-end pr-3 pb-2 pointer-events-none">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="pointer-events-auto px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg hover:bg-primary/90 transition-colors"
        >
          Hoje
        </button>
      </div>
    </motion.div>
  );
};

export default DayTimelineView;
