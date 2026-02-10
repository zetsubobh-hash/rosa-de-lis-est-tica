import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, isBefore, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, ChevronRight, Clock, ArrowLeft, Check, CalendarPlus, Plus, Trash2 } from "lucide-react";
import { getServiceBySlug } from "@/data/services";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
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
  const { items, addItem, removeItem, clearCart } = useCart();
  const service = slug ? getServiceBySlug(slug) : undefined;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [step, setStep] = useState<Step>("calendar");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate(`/servico/${slug}`, { replace: true });
    }
  }, [user, slug, navigate]);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchBooked = async () => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", dateStr)
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
    // Show selection visually, then add to cart and go to confirm after a short delay
    setTimeout(() => {
      if (service && selectedDate) {
        addItem({
          serviceSlug: service.slug,
          serviceTitle: service.title,
          serviceDuration: service.duration,
          date: format(selectedDate, "yyyy-MM-dd"),
          dateFormatted: format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          time,
          iconName: service.slug,
        });
      }
      setStep("confirm");
    }, 500);
  };

  const handleConfirmAll = async () => {
    if (!user || items.length === 0) return;
    setLoading(true);
    try {
      const inserts = items.map((item) => ({
        user_id: user.id,
        service_slug: item.serviceSlug,
        service_title: item.serviceTitle,
        appointment_date: item.date,
        appointment_time: item.time,
      }));
      const { error } = await supabase.from("appointments").insert(inserts);
      if (error) throw error;
      toast({
        title: "Agendamento confirmado! ✅",
        description: `${items.length} procedimento(s) agendado(s) com sucesso.`,
      });
      clearCart();
      setTimeout(() => navigate("/"), 250);
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

  const handleAddMore = () => {
    setTimeout(() => {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("servicos");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }, 250);
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
                  const isPast = isSameDay(selectedDate, today) && time <= format(new Date(), "HH:mm");
                  const disabled = booked || isPast;
                  return (
                    <motion.button
                      key={time}
                      whileHover={!disabled ? { scale: 1.05 } : undefined}
                      whileTap={!disabled ? { scale: 0.92 } : undefined}
                      disabled={disabled}
                      onClick={() => handleTimeSelect(time)}
                      className={`relative py-3 px-4 rounded-2xl font-body text-sm font-semibold transition-all border ${
                        disabled
                          ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                          : selectedTime === time
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      {selectedTime === time && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md"
                        >
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </motion.div>
                      )}
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      {time}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm — shows ALL cart items */}
          {step === "confirm" && items.length > 0 && (
            <motion.div key="confirm" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6 text-center">
                Confirme seu agendamento
              </h2>
              <div className="bg-card rounded-3xl border border-border shadow-sm p-6 md:p-8 max-w-lg mx-auto">
                {/* Cart items */}
                <div className="space-y-4 mb-6">
                  {items.map((item, idx) => {
                    const itemService = getServiceBySlug(item.serviceSlug);
                    const ItemIcon = itemService?.icon;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-rose-soft"
                      >
                        {ItemIcon && (
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ItemIcon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading text-sm font-bold text-foreground truncate">{item.serviceTitle}</h4>
                          <p className="font-body text-xs text-muted-foreground capitalize">
                            {item.dateFormatted} • {item.time}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(idx)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                <p className="font-body text-xs text-muted-foreground text-center mb-6">
                  {items.length} procedimento(s) selecionado(s)
                </p>

                <motion.button
                  onClick={handleAddMore}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.15)" }}
                  className="flex items-center justify-center gap-2 w-full py-3.5 mb-3 border border-primary text-primary font-body text-sm font-bold rounded-2xl hover:bg-primary/5 transition-all duration-300 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar mais procedimentos
                </motion.button>

                <motion.button
                  onClick={handleConfirmAll}
                  disabled={loading || items.length === 0}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.2)" }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all duration-300 uppercase tracking-wider disabled:opacity-50"
                >
                  <CalendarPlus className="w-5 h-5" />
                  {loading ? "Agendando..." : "Confirmar Agendamento"}
                </motion.button>

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
