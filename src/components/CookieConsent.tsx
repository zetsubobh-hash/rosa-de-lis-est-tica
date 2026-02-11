import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "rosa_cookie_consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Cookie className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">Política de Privacidade</h3>
                <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">
                  Utilizamos cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa{" "}
                  <Link to="/politica-de-privacidade" className="text-primary hover:underline font-semibold">
                    Política de Privacidade
                  </Link>{" "}
                  e com a <span className="font-semibold">LGPD</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAccept}
                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-body text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
              >
                Aceitar
              </button>
              <button
                onClick={handleReject}
                className="flex-1 h-9 rounded-xl border border-border text-muted-foreground font-body text-xs font-bold uppercase tracking-wider hover:bg-muted transition-colors"
              >
                Recusar
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3 h-3 text-muted-foreground/50" />
              <span className="font-body text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                Protegido pela LGPD
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
