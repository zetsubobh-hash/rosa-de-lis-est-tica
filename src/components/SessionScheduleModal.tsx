import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfDay, isBefore, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Clock, ArrowLeft, Check, CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00",
];

interface SessionScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  planId: string;
  sessionNumber: number;
  serviceSlug: string;
  serviceTitle: string;
  userId: string;
}

const SessionScheduleModal = ({
  open,
  onClose,
  onScheduled,
  planId,
  sessionNumber,
  serviceSlug,
  serviceTitle,
  userId,
}: SessionScheduleModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"calendar" | "time">("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("calendar");
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setBookedSlots([]);
    }
  }, [open]);

  // Fetch booked slots when date changes
  useEffect(() => {
    if (!selectedDate || !open) return;
    const fetchBooked = async () => {
      await supabase.rpc("cleanup_stale_pending_appointments");
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", dateStr)
        .in("status", ["confirmed", "pending"]);
      setBookedSlots(data?.map((d: any) => d.appointment_time) || []);
    };
    fetchBooked();
  }, [selectedDate, open]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined);
    if (date) setStep("time");
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { error } = await supabase.from("appointments").insert({
        user_id: userId,
        service_slug: serviceSlug,
        service_title: serviceTitle,
        appointment_date: dateStr,
        appointment_time: selectedTime,
        status: "confirmed",
        plan_id: planId,
        session_number: sessionNumber,
      });
      if (error) throw error;

      toast({
        title: "Sessão agendada!",
        description: `Sessão ${sessionNumber} agendada para ${format(selectedDate, "dd/MM/yyyy")} às ${selectedTime}.`,
      });
      onScheduled();
      onClose();
    } catch (err) {
      console.error("[SessionSchedule] Error:", err);
      toast({
        title: "Erro ao agendar",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-3xl border border-border shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border px-5 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">Agendar Sessão {sessionNumber}</h3>
              <p className="font-body text-xs text-muted-foreground">{serviceTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-5">
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[
                { key: "calendar", label: "Data" },
                { key: "time", label: "Horário" },
              ].map((s, i) => {
                const isActive = step === s.key;
                const isDone = s.key === "calendar" && step === "time";
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    {i > 0 && <div className={`w-8 h-0.5 ${isDone || isActive ? "bg-primary" : "bg-border"} transition-colors`} />}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone ? "bg-primary text-primary-foreground" :
                        isActive ? "bg-primary text-primary-foreground scale-110" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`font-body text-xs font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* Calendar step */}
              {step === "calendar" && (
                <motion.div key="cal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col items-center">
                  <p className="font-body text-sm text-muted-foreground mb-4 text-center">Escolha a data da sessão {sessionNumber}</p>
                  <div className="bg-background rounded-2xl border border-border p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      locale={ptBR}
                      disabled={(date) => isBefore(date, today) || date > maxDate || date.getDay() === 0}
                      className="pointer-events-auto"
                    />
                  </div>
                </motion.div>
              )}

              {/* Time step */}
              {step === "time" && selectedDate && (
                <motion.div key="time" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <button onClick={() => setStep("calendar")} className="flex items-center gap-1 text-primary font-body text-xs font-semibold mb-4 hover:underline">
                    <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                  </button>
                  <p className="font-body text-sm text-muted-foreground mb-1">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="font-body text-xs text-muted-foreground mb-4">Selecione o horário</p>
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {TIME_SLOTS.map((time) => {
                      const booked = bookedSlots.includes(time);
                      const isPast = isSameDay(selectedDate, today) && time <= format(new Date(), "HH:mm");
                      const disabled = booked || isPast;
                      const selected = selectedTime === time;
                      return (
                        <motion.button
                          key={time}
                          whileTap={!disabled ? { scale: 0.92 } : undefined}
                          disabled={disabled}
                          onClick={() => setSelectedTime(time)}
                          className={`relative py-2.5 px-3 rounded-xl font-body text-sm font-semibold transition-all border ${
                            disabled
                              ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                              : selected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                          }`}
                        >
                          {selected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </motion.div>
                          )}
                          <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
                          {time}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Confirm button */}
                  <motion.button
                    onClick={handleConfirm}
                    disabled={!selectedTime || loading}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 uppercase tracking-wider"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    {loading ? "Agendando..." : "Confirmar Sessão"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SessionScheduleModal;
