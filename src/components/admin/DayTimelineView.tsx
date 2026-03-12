import { motion } from "framer-motion";
import { User, Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Service → color mapping for visual distinction
const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string }> = {};
const PALETTE = [
  { bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-400 dark:border-violet-600", text: "text-violet-800 dark:text-violet-200" },
  { bg: "bg-sky-100 dark:bg-sky-900/30", border: "border-sky-400 dark:border-sky-600", text: "text-sky-800 dark:text-sky-200" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-400 dark:border-amber-600", text: "text-amber-800 dark:text-amber-200" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-400 dark:border-rose-600", text: "text-rose-800 dark:text-rose-200" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-400 dark:border-emerald-600", text: "text-emerald-800 dark:text-emerald-200" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-400 dark:border-orange-600", text: "text-orange-800 dark:text-orange-200" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", border: "border-pink-400 dark:border-pink-600", text: "text-pink-800 dark:text-pink-200" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-400 dark:border-teal-600", text: "text-teal-800 dark:text-teal-200" },
];

let colorIndex = 0;
const getServiceColor = (slug: string) => {
  if (!SERVICE_COLORS[slug]) {
    SERVICE_COLORS[slug] = PALETTE[colorIndex % PALETTE.length];
    colorIndex++;
  }
  return SERVICE_COLORS[slug];
};


// Duration estimates in minutes based on common service types
const estimateDuration = (serviceSlug: string): number => {
  const slug = serviceSlug.toLowerCase();
  if (slug.includes("micropigment")) return 120;
  if (slug.includes("sobrancelh")) return 30;
  if (slug.includes("maquiag")) return 60;
  if (slug.includes("drenagem") || slug.includes("massagem")) return 60;
  if (slug.includes("limpeza")) return 90;
  if (slug.includes("peeling")) return 60;
  if (slug.includes("botox") || slug.includes("toxina")) return 45;
  return 60; // default 1h
};

// Timeline runs from 08:00 to 19:00 (11 hours)
const START_HOUR = 8;
const END_HOUR = 19;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const SLOT_HEIGHT = 3.5; // rem per 30 min
const PX_PER_MIN = (SLOT_HEIGHT * 2) / 60; // rem per minute

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
};

const DayTimelineView = ({ appointments, onSelectAppointment }: DayTimelineViewProps) => {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // Sort appointments by time
  const sorted = [...appointments].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  // Detect overlapping appointments for column layout
  const columns: TimelineAppointment[][] = [];
  const aptColumns: Map<string, number> = new Map();

  for (const apt of sorted) {
    const startMin = timeToMinutes(apt.appointment_time);
    const duration = estimateDuration(apt.service_slug);
    const endMin_ = startMin + duration;

    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      const lastInCol = columns[col][columns[col].length - 1];
      const lastStart = timeToMinutes(lastInCol.appointment_time);
      const lastEnd = lastStart + estimateDuration(lastInCol.service_slug);
      if (startMin >= lastEnd) {
        columns[col].push(apt);
        aptColumns.set(apt.id, col);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([apt]);
      aptColumns.set(apt.id, columns.length - 1);
    }
  }

  const totalColumns = Math.max(1, columns.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden"
    >
      <div className="relative" style={{ minHeight: `${hours.length * SLOT_HEIGHT * 2}rem` }}>
        {/* Hour lines */}
        {hours.map((hour) => {
          const topRem = (hour - START_HOUR) * SLOT_HEIGHT * 2;
          return (
            <div key={hour} className="absolute left-0 right-0" style={{ top: `${topRem}rem` }}>
              <div className="flex items-start">
                <span className="w-14 shrink-0 text-right pr-2 font-body text-[11px] text-muted-foreground -translate-y-2">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <div className="flex-1 border-t border-border" />
              </div>
              {/* Half-hour line */}
              <div className="flex items-start" style={{ marginTop: `${SLOT_HEIGHT}rem` }}>
                <span className="w-14 shrink-0 text-right pr-2 font-body text-[10px] text-muted-foreground/50 -translate-y-2">
                  {String(hour).padStart(2, "0")}:30
                </span>
                <div className="flex-1 border-t border-border/40 border-dashed" />
              </div>
            </div>
          );
        })}

        {/* Current time indicator */}
        {(() => {
          const now = new Date();
          const nowMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
          if (nowMin < 0 || nowMin > TOTAL_MINUTES) return null;
          const topRem = nowMin * PX_PER_MIN;
          return (
            <div className="absolute left-12 right-0 z-20 flex items-center" style={{ top: `${topRem}rem` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0 -ml-1" />
              <div className="flex-1 border-t-2 border-destructive" />
            </div>
          );
        })()}

        {/* Appointment blocks */}
        {sorted.map((apt) => {
          const startMin = timeToMinutes(apt.appointment_time);
          const duration = estimateDuration(apt.service_slug);
          const topRem = startMin * PX_PER_MIN;
          const heightRem = duration * PX_PER_MIN;
          const color = getServiceColor(apt.service_slug);
          const profile = apt.profiles;
          const col = aptColumns.get(apt.id) || 0;
          const widthPct = 100 / totalColumns;
          const leftPct = col * widthPct;

          const endHour = Math.floor((startMin + duration) / 60) + START_HOUR;
          const endMinute = (startMin + duration) % 60;
          const timeRange = `${apt.appointment_time} - ${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

          return (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "absolute ml-14 rounded-lg border-l-4 px-2.5 py-1.5 cursor-pointer transition-shadow hover:shadow-lg overflow-hidden z-10",
                color.bg,
                color.border
              )}
              style={{
                top: `${topRem}rem`,
                height: `${Math.max(heightRem, 2.5)}rem`,
                left: `calc(3.5rem + ${leftPct}%)`,
                width: `calc(${widthPct}% - ${totalColumns > 1 ? "0.5rem" : "0.5rem"})`,
                right: totalColumns === 1 ? "0.5rem" : undefined,
              }}
              onClick={() => onSelectAppointment?.(apt.id)}
            >
              <p className={cn("font-heading text-[11px] font-bold leading-tight truncate", color.text)}>
                {timeRange}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-4 h-4 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <User className={cn("w-3 h-3 shrink-0", color.text)} />
                )}
                <span className={cn("font-body text-[11px] font-medium truncate", color.text)}>
                  {profile?.full_name || "Cliente"}
                </span>
              </div>
              {heightRem > 3.5 && (
                <p className={cn("font-body text-[10px] mt-0.5 truncate opacity-80", color.text)}>
                  ✂ {apt.service_title}
                </p>
              )}
              {heightRem > 5 && profile?.phone && (
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={`tel:${profile.phone.replace(/\D/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn("flex items-center gap-0.5 text-[10px] hover:underline", color.text)}
                  >
                    <Phone className="w-2.5 h-2.5" />
                    {profile.phone}
                  </a>
                  <a
                    href={`https://wa.me/55${profile.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </a>
                </div>
              )}
              {apt.session_number && heightRem > 3 && (
                <span className={cn("font-body text-[9px] font-bold opacity-60 mt-0.5 block", color.text)}>
                  Sessão {apt.session_number}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* "Hoje" button */}
      <div className="sticky bottom-4 flex justify-end pr-4 pb-4 pointer-events-none">
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
