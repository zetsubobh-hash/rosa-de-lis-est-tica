import { motion } from "framer-motion";
import { User, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

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
  profiles?: Profile | null;
}

interface DayTimelineViewProps {
  appointments: TimelineAppointment[];
  onSelectAppointment?: (id: string) => void;
}

// Consistent color palette per service slug
const PALETTE = [
  { bg: "#d8b4fe", text: "#581c87" },  // violet
  { bg: "#93c5fd", text: "#1e3a5f" },  // blue
  { bg: "#fcd34d", text: "#713f12" },  // amber/gold
  { bg: "#fda4af", text: "#881337" },  // rose
  { bg: "#6ee7b7", text: "#064e3b" },  // emerald
  { bg: "#fdba74", text: "#7c2d12" },  // orange
  { bg: "#c4b5fd", text: "#4c1d95" },  // purple
  { bg: "#67e8f9", text: "#155e75" },  // cyan
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
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 30-min slots
const ROW_HEIGHT = 40; // px per 30-min slot

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

const DayTimelineView = ({ appointments, onSelectAppointment }: DayTimelineViewProps) => {
  // Build color map consistently
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

  // Build slot labels
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const hour = START_HOUR + Math.floor(i / 2);
    const min = (i % 2) * 30;
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  });

  // Map each appointment to slot positions
  const aptBlocks = sorted.map((apt) => {
    const duration = estimateDuration(apt.service_slug);
    const startSlot = timeToSlotIndex(apt.appointment_time);
    const spanSlots = Math.max(1, Math.ceil(duration / 30));
    return { ...apt, startSlot, spanSlots, duration };
  });

  // Detect overlapping for column layout
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

  // Current time indicator
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
        {/* Grid rows with time labels */}
        {slots.map((label, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 flex"
            style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
          >
            <div className="w-[52px] shrink-0 flex items-start justify-end pr-2 pt-0.5">
              <span className={cn(
                "font-body text-[11px]",
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
            className="absolute left-[48px] right-0 z-30 flex items-center pointer-events-none"
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

          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="absolute z-10 rounded-md cursor-pointer hover:brightness-95 transition-all overflow-hidden px-2 py-1.5"
              style={{
                top: `${top + 1}px`,
                left: colLeft,
                width: colWidth,
                height: `${height}px`,
                backgroundColor: color.bg,
                color: color.text,
              }}
              onClick={() => onSelectAppointment?.(block.id)}
            >
              {/* Time range header */}
              <p className="text-[11px] font-bold leading-tight truncate">
                {timeRange}
              </p>

              {/* Client info */}
              <div className="flex items-center gap-1 mt-0.5">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <User className="w-3.5 h-3.5 shrink-0 opacity-70" />
                )}
                <span className="text-[11px] font-semibold truncate">
                  {profile?.full_name || "Cliente"}
                </span>
              </div>

              {/* Service */}
              {height > 50 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Scissors className="w-3 h-3 shrink-0 opacity-60" />
                  <span className="text-[10px] font-medium truncate opacity-80">
                    {block.service_title}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* "Hoje" floating button */}
      <div className="sticky bottom-3 flex justify-end pr-3 pb-2 pointer-events-none">
        <button
          onClick={() => {
            const container = document.querySelector("[data-timeline-scroll]");
            if (container) container.scrollTop = 0;
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="pointer-events-auto px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg hover:bg-primary/90 transition-colors"
        >
          Hoje
        </button>
      </div>
    </motion.div>
  );
};

export default DayTimelineView;
