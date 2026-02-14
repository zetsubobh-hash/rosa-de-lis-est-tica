import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, ChevronRight, ChevronLeft, Check, ShoppingBag,
  Calendar as CalendarIcon, CreditCard, User, Package, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useAllServicePrices, formatCents, ServicePrice } from "@/hooks/useServicePrices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface ClientProfile {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
}

interface CartItem {
  serviceSlug: string;
  serviceTitle: string;
  type: "avulso" | "plano";
  planName?: string;
  sessions: number;
  priceCents: number;
}

interface PartnerOption {
  id: string;
  full_name: string;
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { step: 1, label: "Cliente", icon: User },
  { step: 2, label: "Serviços", icon: ShoppingBag },
  { step: 3, label: "Agendar", icon: CalendarIcon },
  { step: 4, label: "Pagamento", icon: CreditCard },
] as const;

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "outro", label: "Outro" },
];

const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

/* ─── Component ─── */
const AdminCounterSales = () => {
  const { user } = useAuth();
  const { services, loading: svcLoading } = useServices(true);
  const { prices, loading: pricesLoading } = useAllServicePrices();

  const [step, setStep] = useState<Step>(1);

  // Step 1: Client
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  // Step 2: Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Step 3: Schedule
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ─── Fetch Partners ─── */
  useEffect(() => {
    supabase.from("partners").select("id, full_name").eq("is_active", true).then(({ data }) => {
      if (data) setPartners(data);
    });
  }, []);

  /* ─── Fetch all clients on mount (with partner avatar fallback) ─── */
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  useEffect(() => {
    const fetchClients = async () => {
      const [profilesRes, partnersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone, email, avatar_url").order("full_name"),
        supabase.from("partners").select("user_id, avatar_url"),
      ]);
      const partnerAvatars = new Map<string, string>();
      partnersRes.data?.forEach((p: any) => {
        if (p.avatar_url) partnerAvatars.set(p.user_id, p.avatar_url);
      });
      const clients = (profilesRes.data || []).map((p: any) => ({
        ...p,
        avatar_url: p.avatar_url || partnerAvatars.get(p.user_id) || null,
      }));
      setAllClients(clients as ClientProfile[]);
    };
    fetchClients();
  }, []);

  /* ─── Filter clients by search ─── */
  const filteredClients = useMemo(() => {
    if (!search.trim()) return allClients;
    const term = search.toLowerCase();
    return allClients.filter(c => c.full_name.toLowerCase().includes(term) || c.phone?.includes(term));
  }, [allClients, search]);

  /* ─── Fetch booked times for selected date ─── */
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    supabase
      .from("appointments")
      .select("appointment_time")
      .eq("appointment_date", dateStr)
      .in("status", ["confirmed", "pending"])
      .then(({ data }) => {
        setBookedTimes(data?.map((r: any) => r.appointment_time) || []);
      });
  }, [selectedDate]);

  /* ─── Computed ─── */
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);
  const totalCents = cart.reduce((sum, item) => sum + item.priceCents, 0);
  const canProceed = (s: Step): boolean => {
    if (s === 1) return !!selectedClient;
    if (s === 2) return cart.length > 0;
    if (s === 3) return !!selectedDate && !!selectedTime;
    return !!paymentMethod;
  };

  /* ─── Add to cart ─── */
  const addToCart = (slug: string, title: string, price: ServicePrice | null, type: "avulso" | "plano") => {
    if (!price) return;
    setCart(prev => [...prev, {
      serviceSlug: slug,
      serviceTitle: title,
      type,
      planName: type === "plano" ? price.plan_name : undefined,
      sessions: price.sessions,
      priceCents: price.total_price_cents,
    }]);
  };

  const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  /* ─── Submit sale ─── */
  const handleSubmit = async () => {
    if (!selectedClient || !selectedDate || !selectedTime || !paymentMethod) return;
    setSubmitting(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const resolvedPartnerId = partnerId && partnerId !== "none" ? partnerId : null;

      for (const item of cart) {
        if (item.type === "plano") {
          // Always create a plan for "plano" type, regardless of session count
          const { data: plan, error: planErr } = await supabase
            .from("client_plans")
            .insert({
              user_id: selectedClient.user_id,
              service_slug: item.serviceSlug,
              service_title: item.serviceTitle,
              plan_name: item.planName || "Avulso",
              total_sessions: item.sessions,
              completed_sessions: 0,
              status: "active",
              created_by: "admin",
              created_by_user_id: user!.id,
            })
            .select("id")
            .single();
          if (planErr) throw planErr;

          // Create first session appointment linked to the plan
          const { error: apptErr } = await supabase.from("appointments").insert({
            user_id: selectedClient.user_id,
            service_slug: item.serviceSlug,
            service_title: item.serviceTitle,
            appointment_date: dateStr,
            appointment_time: selectedTime,
            status: "confirmed",
            plan_id: plan.id,
            session_number: 1,
            partner_id: resolvedPartnerId,
            notes: notes || null,
          });
          if (apptErr) throw apptErr;
        } else {
          // Single session (avulso) — no plan
          const { error: apptErr } = await supabase.from("appointments").insert({
            user_id: selectedClient.user_id,
            service_slug: item.serviceSlug,
            service_title: item.serviceTitle,
            appointment_date: dateStr,
            appointment_time: selectedTime,
            status: "confirmed",
            partner_id: resolvedPartnerId,
            notes: notes || null,
          });
          if (apptErr) throw apptErr;
        }
      }

      // Register payment
      if (totalCents > 0) {
        await supabase.from("payments").insert([{
          user_id: selectedClient.user_id,
          method: paymentMethod,
          amount_cents: totalCents,
          status: "paid",
          metadata: { source: "counter_sale", items: cart } as any,
        }]);
      }

      toast.success("Venda registrada com sucesso!");
      // Reset
      setStep(1);
      setSelectedClient(null);
      setCart([]);
      setSelectedDate(undefined);
      setSelectedTime("");
      setPaymentMethod("");
      setNotes("");
      setSearch("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar venda");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Render Steps ─── */
  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map(({ step: s, label, icon: Icon }, idx) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => s < step && setStep(s as Step)}
              disabled={s > step}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body font-medium transition-all",
                s === step
                  ? "bg-primary text-primary-foreground shadow-md"
                  : s < step
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
            {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* ─── STEP 1: Client ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Selecionar Cliente</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="pl-10 font-body"
                />
              </div>

              {selectedClient && (
                <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-center gap-3">
                  {selectedClient.avatar_url ? (
                    <img src={selectedClient.avatar_url} alt={selectedClient.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-heading font-bold text-sm">
                      {selectedClient.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-foreground truncate">{selectedClient.full_name}</p>
                    <p className="font-body text-xs text-muted-foreground">{selectedClient.phone}</p>
                  </div>
                  <Check className="w-5 h-5 text-primary" />
                </div>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredClients.filter(c => c.user_id !== selectedClient?.user_id).map(client => (
                  <button
                    key={client.user_id}
                    onClick={() => { setSelectedClient(client); setSearch(""); }}
                    className="w-full p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 flex items-center gap-3 transition-all"
                  >
                    {client.avatar_url ? (
                      <img src={client.avatar_url} alt={client.full_name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-heading font-bold text-xs">
                        {client.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-body text-sm font-medium text-foreground truncate">{client.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{client.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 2: Services ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Selecionar Serviços</h2>

              {/* Cart summary */}
              {cart.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
                  <p className="font-body text-sm font-semibold text-foreground">Carrinho ({cart.length})</p>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-body text-foreground truncate">
                        {item.serviceTitle}
                        {item.type === "plano" && <span className="text-muted-foreground"> • {item.planName} ({item.sessions}x)</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-body font-semibold text-primary whitespace-nowrap">{formatCents(item.priceCents)}</span>
                        <button onClick={() => removeFromCart(idx)} className="text-destructive hover:text-destructive/80 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-body font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">{formatCents(totalCents)}</span>
                  </div>
                </div>
              )}

              {/* Service list */}
              {(svcLoading || pricesLoading) ? (
                <p className="font-body text-sm text-muted-foreground">Carregando serviços...</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeServices.map(svc => {
                    const svcPrices = prices.filter(p => p.service_slug === svc.slug);
                    const avulsoPrice = svcPrices.find(p => p.sessions === 1);
                    return (
                      <div key={svc.slug} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h3 className="font-heading text-sm font-bold text-foreground">{svc.title}</h3>
                        </div>
                        <div className="space-y-1.5">
                          {avulsoPrice && (
                            <button
                              onClick={() => addToCart(svc.slug, svc.title, avulsoPrice, "avulso")}
                              className="w-full flex justify-between items-center px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 text-sm font-body transition-all"
                            >
                              <span className="text-foreground">Sessão Avulsa</span>
                              <span className="font-semibold text-primary">{formatCents(avulsoPrice.total_price_cents)}</span>
                            </button>
                          )}
                          {svcPrices.filter(p => p.sessions > 1).map(plan => (
                            <button
                              key={plan.id}
                              onClick={() => addToCart(svc.slug, svc.title, plan, "plano")}
                              className="w-full flex justify-between items-center px-3 py-2 rounded-lg hover:bg-muted/50 border border-border text-sm font-body transition-all"
                            >
                              <span className="text-foreground flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                {plan.plan_name} ({plan.sessions}x)
                              </span>
                              <span className="font-semibold text-foreground">{formatCents(plan.total_price_cents)}</span>
                            </button>
                          ))}
                          {svcPrices.length === 0 && (
                            <p className="font-body text-xs text-muted-foreground italic">Sem preços cadastrados</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: Schedule ─── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Agendar</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-body text-sm font-medium text-foreground">Data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-body", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {selectedDate ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="font-body text-sm font-medium text-foreground">Horário</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                    {TIME_SLOTS.map(time => {
                      const booked = bookedTimes.includes(time);
                      return (
                        <button
                          key={time}
                          disabled={booked}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "px-2 py-1.5 rounded-lg text-xs font-body font-medium transition-all",
                            booked
                              ? "bg-muted text-muted-foreground line-through cursor-not-allowed"
                              : selectedTime === time
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted/50 text-foreground hover:bg-primary/10"
                          )}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-body text-sm font-medium text-foreground">Profissional (opcional)</label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Selecionar profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="font-body text-sm font-medium text-foreground">Observações (opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: cliente prefere atendimento no período da manhã"
                  className="font-body"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ─── STEP 4: Payment & Confirm ─── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-heading text-lg font-bold text-foreground">Pagamento e Confirmação</h2>

              {/* Summary */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm text-foreground font-medium">{selectedClient?.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-sm text-foreground">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                  </span>
                </div>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm font-body">
                    <span className="text-foreground">
                      {item.serviceTitle}
                      {item.type === "plano" && ` (${item.planName})`}
                    </span>
                    <span className="font-semibold text-primary">{formatCents(item.priceCents)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-body font-bold text-lg">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCents(totalCents)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-body text-sm font-medium text-foreground">Forma de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl text-sm font-body font-medium border transition-all",
                        paymentMethod === m.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border text-foreground hover:border-primary/50"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setStep((step - 1) as Step)}
          disabled={step === 1}
          className="font-body"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canProceed(step)}
            className="font-body"
          >
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed(4) || submitting}
            className="font-body bg-primary hover:bg-primary/90"
          >
            {submitting ? "Registrando..." : "Confirmar Venda"} <Check className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdminCounterSales;
