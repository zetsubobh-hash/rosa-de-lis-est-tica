import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { QrCode, CreditCard, CheckCircle, Copy, ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getServiceBySlug } from "@/data/services";
import { useAllServicePrices, formatCents } from "@/hooks/useServicePrices";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

interface AppointmentInfo {
  id: string;
  service_title: string;
  service_slug: string;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
}

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { settings, loading: settingsLoading } = usePaymentSettings();
  const { prices: allPrices } = useAllServicePrices();

  const [appointments, setAppointments] = useState<AppointmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<"pix" | "mercadopago" | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Get appointment IDs from URL
  const appointmentIds = searchParams.get("ids")?.split(",") || [];

  useEffect(() => {
    console.log("[Checkout] useEffect - user:", user?.id, "appointmentIds:", appointmentIds);
    
    if (!user) {
      console.log("[Checkout] No user, redirecting to home");
      navigate("/", { replace: true });
      return;
    }

    const fetchAppointments = async () => {
      if (appointmentIds.length === 0) {
        console.log("[Checkout] No appointment IDs, redirecting to home");
        navigate("/", { replace: true });
        return;
      }
      console.log("[Checkout] Fetching appointments for IDs:", appointmentIds);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, service_title, service_slug, appointment_date, appointment_time, notes")
        .in("id", appointmentIds)
        .eq("user_id", user.id)
        .eq("status", "pending");

      console.log("[Checkout] Query result - data:", JSON.stringify(data), "error:", JSON.stringify(error));
      
      if (data && data.length > 0) {
        setAppointments(data);
      } else {
        console.log("[Checkout] No matching appointments found, redirecting to home");
        navigate("/", { replace: true });
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [user]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(settings.pix_key);
    setPixCopied(true);
    toast({ title: "Chave PIX copiada! 📋" });
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleConfirmPixPayment = async () => {
    setConfirming(true);
    try {
      // Create payment records for PIX manual
      for (const apt of appointments) {
        const { error } = await supabase.from("payments").insert({
          user_id: user!.id,
          appointment_id: apt.id,
          method: "pix_manual",
          status: "pending",
        });
        if (error) throw error;
      }

      // Update appointments to confirmed
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .in("id", appointmentIds);
      if (error) throw error;

      toast({
        title: "Agendamento confirmado! ✅",
        description: "Realize o PIX e seu agendamento será validado.",
      });
      navigate("/");
    } catch {
      toast({ title: "Erro ao confirmar", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  const handleMercadoPago = () => {
    // TODO: Integrate with Mercado Pago Checkout Transparente
    toast({
      title: "Em breve",
      description: "Integração com Mercado Pago em desenvolvimento.",
    });
  };

  const availableMethods = [];
  if (settings.pix_enabled) availableMethods.push("pix");
  if (settings.mercadopago_enabled) availableMethods.push("mercadopago");

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-1">Pagamento</p>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">Finalizar Agendamento</h1>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Appointment summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">Resumo</h2>
          <div className="space-y-3">
            {appointments.map((apt) => {
              const svc = getServiceBySlug(apt.service_slug);
              const Icon = svc?.icon;
              // Get price from notes (plan info) or fallback
              let priceCents = 0;
              let planName = "";
              if (apt.notes) {
                try {
                  const noteData = JSON.parse(apt.notes);
                  priceCents = noteData.price_cents || 0;
                  planName = noteData.plan || "";
                } catch { /* ignore */ }
              }
              // If no price in notes, try to find from DB prices
              if (!priceCents && allPrices.length > 0) {
                const dbPrice = allPrices.find((p) => p.service_slug === apt.service_slug && p.plan_name === "Essencial");
                if (dbPrice) priceCents = dbPrice.total_price_cents;
              }
              return (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-soft">
                  {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading text-sm font-bold text-foreground truncate">{apt.service_title}</h4>
                    <p className="font-body text-xs text-muted-foreground">
                      {apt.appointment_date} • {apt.appointment_time}
                      {planName && ` • ${planName}`}
                    </p>
                  </div>
                  {priceCents > 0 && (
                    <span className="font-heading text-sm font-bold text-primary shrink-0">
                      {formatCents(priceCents)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {(() => {
            const total = appointments.reduce((sum, apt) => {
              if (apt.notes) {
                try { return sum + (JSON.parse(apt.notes).price_cents || 0); } catch { return sum; }
              }
              return sum;
            }, 0);
            return total > 0 ? (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="font-body text-sm font-semibold text-foreground">Total</span>
                <span className="font-heading text-lg font-bold text-primary">{formatCents(total)}</span>
              </div>
            ) : (
              <p className="font-body text-xs text-muted-foreground text-center mt-4">
                Valores conforme avaliação personalizada.
              </p>
            );
          })()}
        </motion.div>

        {/* Payment methods */}
        {availableMethods.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-8 bg-card rounded-3xl border border-border">
            <p className="font-body text-muted-foreground">Nenhum método de pagamento configurado. Entre em contato pelo WhatsApp.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-foreground">Escolha o método de pagamento</h2>

            {/* PIX option */}
            {settings.pix_enabled && (
              <motion.button
                onClick={() => setSelectedMethod("pix")}
                whileHover={{ scale: 1.02 }}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                  selectedMethod === "pix"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">PIX</h3>
                    <p className="font-body text-xs text-muted-foreground">Transferência instantânea</p>
                  </div>
                  {selectedMethod === "pix" && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
                </div>
              </motion.button>
            )}

            {/* Mercado Pago option */}
            {settings.mercadopago_enabled && (
              <motion.button
                onClick={() => setSelectedMethod("mercadopago")}
                whileHover={{ scale: 1.02 }}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                  selectedMethod === "mercadopago"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">Cartão de Crédito/Débito</h3>
                    <p className="font-body text-xs text-muted-foreground">Via Mercado Pago</p>
                  </div>
                  {selectedMethod === "mercadopago" && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
                </div>
              </motion.button>
            )}

            {/* PIX details */}
            {selectedMethod === "pix" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-card rounded-3xl border border-border p-6 space-y-4"
              >
                <h3 className="font-heading text-sm font-bold text-foreground">Dados do PIX</h3>
                <div className="space-y-2">
                  <p className="font-body text-xs text-muted-foreground">Beneficiário</p>
                  <p className="font-body text-sm font-semibold text-foreground">{settings.pix_beneficiary || "—"}</p>
                </div>
                <div className="space-y-2">
                  <p className="font-body text-xs text-muted-foreground">Chave PIX ({settings.pix_key_type.toUpperCase()})</p>
                  <div className="flex items-center gap-2">
                    <p className="font-body text-sm font-semibold text-foreground flex-1 break-all">{settings.pix_key}</p>
                    <button
                      onClick={handleCopyPix}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-body text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                <motion.button
                  onClick={handleConfirmPixPayment}
                  disabled={confirming}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 uppercase tracking-wider"
                >
                  <CheckCircle className="w-5 h-5" />
                  {confirming ? "Confirmando..." : "Já fiz o PIX — Confirmar"}
                </motion.button>

                <p className="font-body text-[11px] text-muted-foreground text-center">
                  Após confirmar, seu agendamento será validado pela equipe.
                </p>
              </motion.div>
            )}

            {/* Mercado Pago details */}
            {selectedMethod === "mercadopago" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-card rounded-3xl border border-border p-6"
              >
                <motion.button
                  onClick={handleMercadoPago}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all uppercase tracking-wider"
                >
                  <CreditCard className="w-5 h-5" />
                  Pagar com Mercado Pago
                </motion.button>
                <p className="font-body text-[11px] text-muted-foreground text-center mt-3">
                  Pagamento seguro via Mercado Pago.
                </p>
              </motion.div>
            )}
          </div>
        )}

        <Link to="/" className="flex items-center justify-center gap-1 mt-8 font-body text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default Checkout;
