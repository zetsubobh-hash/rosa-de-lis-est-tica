import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, ChevronRight, Clock, ArrowLeft, Check, CalendarPlus, Plus } from "lucide-react";
import { getServiceBySlug } from "@/data/services";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00",
];

type Step = "calendar" | "time" | "confirm";

const Agendar = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const service = slug ? getServiceBySlug(slug) : undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [step, setStep] = useState<Step>("calendar");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(`/servico/${slug}`, { replace: true });
    }
  }, [user, slug, navigate]);

  // Fetch booked slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    const fetchBooked = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", dateStr)
        .eq("service_slug", slug || "")
        .eq("status", "confirmed");
      setBookedSlots(data?.map((d: any) => d.appointment_time) || []);
    };
    fetchBooked();
  }, [selectedDate, slug]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined);
    if (date) setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!user || !selectedDate || !selectedTime || !service) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        service_slug: service.slug,
        service_title: service.title,
        appointment_date: format(selectedDate, "yyyy-MM-dd"),
        appointment_time: selectedTime,
      });
      if (error) throw error;
      toast({
        title: "Agendamento confirmado! ✅",
        description: `${service.title} em ${format(selectedDate, "dd/MM/yyyy")} às ${selectedTime}`,
      });
      navigate(`/servico/${slug}`);
    } catch {
      toast({
        title: "Erro ao agendar",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);

  if (!service) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Serviço não encontrado</h1>
            <Link to="/" className="text-primary hover:underline font-body">← Voltar ao início</Link>
          </div>
        </div>
      </>
    );
  }

  const Icon = service.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6 font-body text-sm text-primary-foreground/60"
          >
            <Link to="/" className="hover:text-primary-foreground transition-colors">Início</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/servico/${slug}`} className="hover:text-primary-foreground transition-colors">{service.title}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary-foreground">Agendar</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <CalendarCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-1">Agendamento</p>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">{service.title}</h1>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Steps indicator */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { key: "calendar", label: "Data" },
            { key: "time", label: "Horário" },
            { key: "confirm", label: "Confirmar" },
          ].map((s, i) => {
            const isActive = step === s.key;
            const isDone =
              (s.key === "calendar" && (step === "time" || step === "confirm")) ||
              (s.key === "time" && step === "confirm");
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-0.5 ${isDone || isActive ? "bg-primary" : "bg-border"} transition-colors`} />}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone ? "bg-primary text-primary-foreground" :
                    isActive ? "bg-primary text-primary-foreground scale-110" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`font-body text-xs font-semibold hidden sm:inline ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Calendar */}
          {step === "calendar" && (
            <motion.div key="calendar" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col items-center">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2 text-center">Escolha a data</h2>
              <p className="font-body text-muted-foreground text-sm mb-6 text-center">Selecione um dia disponível no calendário</p>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={ptBR}
                  disabled={(date) => isBefore(date, today) || date > maxDate || date.getDay() === 0}
                  className="pointer-events-auto"
                />
              </div>
              <p className="font-body text-muted-foreground text-xs mt-4">Domingos indisponíveis. Agendamento até 60 dias.</p>
            </motion.div>
          )}

          {/* Step 2: Time */}
          {step === "time" && selectedDate && (
            <motion.div key="time" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button onClick={() => setStep("calendar")} className="flex items-center gap-1 text-primary font-body text-sm font-semibold mb-6 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-1">Escolha o horário</h2>
              <p className="font-body text-muted-foreground text-sm mb-6">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {TIME_SLOTS.map((time) => {
                  const booked = bookedSlots.includes(time);
                  // Disable past times for today
                  const isPast = isSameDay(selectedDate, today) && time <= format(new Date(), "HH:mm");
                  const disabled = booked || isPast;
                  return (
                    <motion.button
                      key={time}
                      whileHover={!disabled ? { scale: 1.05 } : undefined}
                      whileTap={!disabled ? { scale: 0.95 } : undefined}
                      disabled={disabled}
                      onClick={() => handleTimeSelect(time)}
                      className={`py-3 px-4 rounded-2xl font-body text-sm font-semibold transition-all border ${
                        disabled
                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                          : selectedTime === time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      {time}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && selectedDate && selectedTime && (
            <motion.div key="confirm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button onClick={() => setStep("time")} className="flex items-center gap-1 text-primary font-body text-sm font-semibold mb-6 hover:underline">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6 text-center">Confirme seu agendamento</h2>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-8 max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{service.title}</h3>
                    <p className="font-body text-muted-foreground text-xs">{service.duration}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-soft">
                    <CalendarCheck className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">Data</p>
                      <p className="font-body text-sm font-semibold text-foreground capitalize">
                        {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-soft">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">Horário</p>
                      <p className="font-body text-sm font-semibold text-foreground">{selectedTime}</p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/#servicos"
                  className="flex items-center justify-center gap-2 w-full py-3.5 mb-3 border border-primary text-primary font-body text-sm font-bold rounded-2xl hover:bg-primary/5 transition-all duration-300 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar mais procedimentos
                </Link>

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all duration-300 uppercase tracking-wider disabled:opacity-50"
                >
                  <CalendarPlus className="w-5 h-5" />
                  {loading ? "Agendando..." : "Confirmar Agendamento"}
                </button>

                <p className="font-body text-[11px] text-muted-foreground text-center mt-4">
                  Valores podem variar conforme avaliação personalizada.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Agendar;
