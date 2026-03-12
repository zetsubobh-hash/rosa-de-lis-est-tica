import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import NewClientInlineForm from "@/components/admin/NewClientInlineForm";

interface ServicePrice {
  id: string;
  plan_name: string;
  sessions: number;
  total_price_cents: number;
  price_per_session_cents: number;
  service_slug: string;
}

interface QuickBookModalProps {
  open: boolean;
  time: string;
  dateStr: string; // yyyy-MM-dd
  dateLabel: string; // dd/MM/yyyy
  partnerId: string | null;
  allProfiles: { user_id: string; full_name: string }[];
  allServices: { slug: string; title: string }[];
  onProfileCreated: (client: { user_id: string; full_name: string }) => void;
  onClose: () => void;
  onBooked: () => void;
}

const QuickBookModal = ({
  open,
  time,
  dateStr,
  dateLabel,
  partnerId,
  allProfiles,
  allServices,
  onProfileCreated,
  onClose,
  onBooked,
}: QuickBookModalProps) => {
  const [userId, setUserId] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  // Plan selection
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(""); // "" = sessão avulsa
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setUserId("");
      setServiceSlug("");
      setShowNewClient(false);
      setSelectedPlanId("");
      setServicePrices([]);
    }
  }, [open]);

  // Load plans when service changes
  useEffect(() => {
    if (!serviceSlug) {
      setServicePrices([]);
      setSelectedPlanId("");
      return;
    }
    const fetchPrices = async () => {
      setLoadingPrices(true);
      const { data } = await supabase
        .from("service_prices")
        .select("id, plan_name, sessions, total_price_cents, price_per_session_cents, service_slug")
        .eq("service_slug", serviceSlug)
        .order("sessions");
      setServicePrices(data || []);
      setSelectedPlanId("");
      setLoadingPrices(false);
    };
    fetchPrices();
  }, [serviceSlug]);

  const selectedPlan = servicePrices.find((p) => p.id === selectedPlanId);

  const handleConfirm = async () => {
    if (!dateStr || !userId || !serviceSlug) return;
    setSaving(true);

    const service = allServices.find((s) => s.slug === serviceSlug);
    const serviceTitle = service?.title || serviceSlug;

    try {
      if (selectedPlan) {
        // Create client_plan + first appointment
        const { data: plan, error: planError } = await supabase
          .from("client_plans")
          .insert({
            user_id: userId,
            service_slug: serviceSlug,
            service_title: serviceTitle,
            plan_name: selectedPlan.plan_name,
            total_sessions: selectedPlan.sessions,
            completed_sessions: 0,
            status: "active",
            created_by: "admin",
          })
          .select("id")
          .single();

        if (planError) throw planError;

        const { error: aptError } = await supabase.from("appointments").insert({
          user_id: userId,
          service_slug: serviceSlug,
          service_title: serviceTitle,
          appointment_date: dateStr,
          appointment_time: time,
          status: "confirmed",
          partner_id: partnerId,
          plan_id: plan.id,
          session_number: 1,
        });

        if (aptError) {
          if (aptError.code === "23505") {
            toast.error("Horário já reservado. Escolha outro.");
          } else {
            throw aptError;
          }
          setSaving(false);
          return;
        }

        toast.success(`Pacote ${selectedPlan.plan_name} criado + sessão 1 agendada ✅`);
      } else {
        // Sessão avulsa
        const { error } = await supabase.from("appointments").insert({
          user_id: userId,
          service_slug: serviceSlug,
          service_title: serviceTitle,
          appointment_date: dateStr,
          appointment_time: time,
          status: "confirmed",
          partner_id: partnerId,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("Horário já reservado. Escolha outro.");
          } else {
            throw error;
          }
          setSaving(false);
          return;
        }

        toast.success("Agendamento criado ✅");
      }

      onBooked();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao agendar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm p-4 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl w-full sm:max-w-md p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="flex sm:hidden justify-center -mt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-foreground">
              Agendar às {time}
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="font-body text-sm text-muted-foreground">{dateLabel}</p>

          {/* Client select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-body text-xs font-semibold text-foreground">Cliente</label>
              <button
                type="button"
                onClick={() => setShowNewClient(!showNewClient)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                {showNewClient ? <><X className="w-3 h-3" /> Cancelar</> : <><UserPlus className="w-3 h-3" /> Novo Cliente</>}
              </button>
            </div>

            {showNewClient ? (
              <NewClientInlineForm
                onClientCreated={(client) => {
                  onProfileCreated({ user_id: client.user_id, full_name: client.full_name });
                  setUserId(client.user_id);
                  setShowNewClient(false);
                }}
                onCancel={() => setShowNewClient(false)}
              />
            ) : (
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 font-body text-sm text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione o cliente...</option>
                {allProfiles.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Service select */}
          <div>
            <label className="font-body text-xs font-semibold text-foreground block mb-1.5">Procedimento</label>
            <select
              value={serviceSlug}
              onChange={(e) => setServiceSlug(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 font-body text-sm text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="">Selecione o procedimento...</option>
              {allServices.map((s) => (
                <option key={s.slug} value={s.slug}>{s.title}</option>
              ))}
            </select>
          </div>

          {/* Plan/Package selection */}
          {serviceSlug && !loadingPrices && servicePrices.length > 0 && (
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Tipo de Agendamento
              </label>
              <div className="space-y-1.5">
                {/* Sessão avulsa */}
                <button
                  onClick={() => setSelectedPlanId("")}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all font-body text-sm ${
                    selectedPlanId === ""
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Sessão avulsa</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedPlanId === "" ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {selectedPlanId === "" && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">1 procedimento sem pacote</p>
                </button>

                {/* Plans */}
                {servicePrices.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all font-body text-sm ${
                      selectedPlanId === plan.id
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{plan.plan_name}</span>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPlanId === plan.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                      }`}>
                        {selectedPlanId === plan.id && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.sessions} sessões · {(plan.total_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {" "}({(plan.price_per_session_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/sessão)
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loadingPrices && serviceSlug && (
            <div className="flex items-center justify-center py-3">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          <button
            disabled={saving || !userId || !serviceSlug}
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving
              ? "Agendando..."
              : selectedPlan
              ? `Criar Pacote ${selectedPlan.plan_name} + Agendar Sessão 1`
              : "Confirmar Agendamento"
            }
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuickBookModal;
