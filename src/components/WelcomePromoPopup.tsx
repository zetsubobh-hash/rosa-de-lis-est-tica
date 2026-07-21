import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

const DISMISS_KEY = "welcome_popup_dismissed_at";
const DISMISS_HOURS = 12;

const WelcomePromoPopup = () => {
  const { settings, loading } = useSiteSettings();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (authLoading) return;
    if (user) return; // não exibe para usuários já logados
    if (settings.welcome_popup_enabled !== "true") return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    if (dismissedAt && hoursSince < DISMISS_HOURS) return;

    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [loading, authLoading, user, settings.welcome_popup_enabled]);

  const close = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const title = settings.welcome_popup_title || "🎁 Ganhe seu prêmio de boas-vindas!";
  const subtitle =
    settings.welcome_popup_subtitle ||
    "Faça o seu cadastro e concorra a brindes em procedimentos estéticos.";
  const cta = settings.welcome_popup_cta || "Girar a Roleta";
  const link = settings.welcome_popup_link || "/roleta-premio";

  const handleCta = () => {
    close();
    if (authLoading) return;
    if (!user) {
      // Cliente não cadastrado → abre cadastro
      setAuthOpen(true);
      return;
    }
    // Cliente logado → segue fluxo (roleta ou link configurado)
    navigate(link);
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    navigate(link);
  };

  if (!show) {
    return (
      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
        defaultMode="register"
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            className="relative w-full max-w-md mx-auto my-auto overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/30 bg-card shadow-2xl"
          >
            {/* Glow backdrops */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 sm:h-64 sm:w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 sm:h-64 sm:w-64 rounded-full bg-accent/30 blur-3xl" />

            {/* Sparkles ribbon */}
            <div className="relative bg-gradient-to-br from-primary via-primary to-primary/70 px-5 sm:px-6 pt-6 sm:pt-8 pb-12 sm:pb-14 text-primary-foreground text-center overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
                className="mx-auto mb-2 sm:mb-3 inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/30"
              >
                <Gift className="h-7 w-7 sm:h-8 sm:w-8" />
              </motion.div>

              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [0, -20 - i * 6, -40 - i * 8],
                    x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 3)],
                  }}
                  transition={{ repeat: Infinity, duration: 3, delay: i * 0.35 }}
                  style={{
                    top: `${20 + (i * 9) % 60}%`,
                    left: `${10 + (i * 17) % 80}%`,
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-white/80" />
                </motion.div>
              ))}

              <button
                onClick={close}
                aria-label="Fechar"
                className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 rounded-full bg-white/15 p-1.5 backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="relative -mt-8 rounded-t-3xl bg-card px-5 sm:px-6 pt-5 sm:pt-6 pb-5 sm:pb-6 text-center">
              <h2 className="font-heading text-xl sm:text-2xl font-bold leading-tight text-foreground">
                {title}
              </h2>
              <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>

              <button
                type="button"
                onClick={handleCta}
                className="group mt-4 sm:mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 sm:py-3.5 font-heading text-sm sm:text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5 transition-transform group-hover:rotate-12" />
                {user ? cta : "Fazer meu cadastro"}
              </button>

              <button
                onClick={close}
                className="mt-3 font-body text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Agora não
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
        defaultMode="register"
      />
    </>
  );
};

export default WelcomePromoPopup;
