import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, UserPlus, LogIn, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AuthModal from "@/components/AuthModal";
import WelcomeRoulette from "@/components/WelcomeRoulette";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Status = "loading" | "must-auth" | "enabled-spin" | "already-spun" | "disabled" | "no-items";

const RoletaPremio = () => {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [status, setStatus] = useState<Status>("loading");
  const [authOpen, setAuthOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  const businessName = settings?.business_name || "Rosa de Lis Estética";

  useEffect(() => {
    if (authLoading) return;

    const check = async () => {
      // Check if welcome roulette feature is enabled (via public RPC — works for anon)
      const { data: cfg } = await supabase.rpc("get_public_payment_settings");
      const rows = (cfg as any[] | null) ?? [];
      const enabled = rows.find((r) => r.key === "welcome_roulette_enabled")?.value;
      const itemsRaw = rows.find((r) => r.key === "welcome_roulette_items")?.value;

      if (enabled !== "true") {
        setStatus("disabled");
        return;
      }

      // Validate items list — empty/invalid/no active prize = show clear fallback
      let hasActiveItems = false;
      try {
        const parsed = itemsRaw ? JSON.parse(itemsRaw) : [];
        if (Array.isArray(parsed)) {
          hasActiveItems = parsed.some(
            (p: any) => p?.enabled !== false && Number(p?.weight) > 0
          );
        }
      } catch {
        hasActiveItems = false;
      }
      if (!hasActiveItems) {
        setStatus("no-items");
        return;
      }

      if (!user) {
        setStatus("must-auth");
        return;
      }

      // Check if user already spun
      const { data: existing } = await supabase
        .from("coupons")
        .select("id")
        .eq("user_id", user.id)
        .like("code", "BV-%")
        .limit(1);

      if (existing && existing.length > 0) {
        setStatus("already-spun");
      } else {
        setStatus("enabled-spin");
      }
    };

    check();
  }, [user, authLoading]);

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    // After successful auth, force re-check (user will be populated soon)
    setStatus("loading");
  };

  const handleSpinClick = () => {
    setRouletteOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card border border-border rounded-3xl shadow-xl p-6 md:p-8 text-center space-y-5"
      >
        {/* Header */}
        <div className="relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary/15 rounded-full blur-3xl" />
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
            🎰 Cartão Premiado!
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Bem-vindo(a) à <strong className="text-foreground">{businessName}</strong>
          </p>
        </div>

        {status === "loading" && (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {status === "disabled" && (
          <div className="rounded-2xl bg-muted/50 border border-border p-5 space-y-2">
            <p className="font-body text-sm text-foreground font-medium">
              😔 Promoção indisponível
            </p>
            <p className="font-body text-xs text-muted-foreground">
              A roleta de prêmios está temporariamente desativada. Entre em contato conosco para mais informações.
            </p>
          </div>
        )}

        {status === "must-auth" && (
          <>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 space-y-3">
              <p className="font-body text-sm text-foreground leading-relaxed">
                Você tem direito a <strong className="text-primary">1 giro grátis</strong> na nossa Roleta da Sorte!
                Pode ganhar <strong>descontos</strong> ou até <strong>sessões grátis</strong> 🎁
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Para garantir seu prêmio, crie sua conta abaixo. Leva menos de 1 minuto.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                size="lg"
                onClick={() => setAuthOpen(true)}
                className="w-full gap-2 text-base font-heading"
              >
                <UserPlus className="w-5 h-5" />
                Cadastrar e Girar a Roleta
              </Button>
              <button
                onClick={() => setAuthOpen(true)}
                className="text-xs text-muted-foreground hover:text-primary font-body inline-flex items-center gap-1"
              >
                <LogIn className="w-3 h-3" />
                Já tenho conta — fazer login
              </button>
            </div>
          </>
        )}

        {status === "enabled-spin" && (
          <>
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
              <p className="font-body text-sm text-foreground font-medium">
                Tudo pronto!
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Clique abaixo e gire a roleta para descobrir seu prêmio. Você tem direito a <strong>1 giro</strong>.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleSpinClick}
              className="w-full gap-2 text-base font-heading"
            >
              <Gift className="w-5 h-5" />
              Girar a Roleta!
            </Button>
          </>
        )}

        {status === "already-spun" && (
          <>
            <div className="rounded-2xl bg-muted/50 border border-border p-5 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="font-body text-sm text-foreground font-medium">
                Você já usou seu giro 🎉
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Se ganhou um cupom ou sessão grátis, ele já está na sua conta. Aproveite!
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild className="font-body">
                <a href="/meus-agendamentos">Meus Cupons</a>
              </Button>
              <Button asChild className="font-body">
                <a href="/">Ver serviços</a>
              </Button>
            </div>
          </>
        )}

        <p className="font-body text-[11px] text-muted-foreground/70 pt-2 border-t border-border">
          Promoção válida para novos cadastros — limite de 1 giro por pessoa.
        </p>
      </motion.div>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
      />

      {rouletteOpen && (
        <WelcomeRoulette onClose={() => { setRouletteOpen(false); setStatus("already-spun"); }} />
      )}
    </div>
  );
};

export default RoletaPremio;
