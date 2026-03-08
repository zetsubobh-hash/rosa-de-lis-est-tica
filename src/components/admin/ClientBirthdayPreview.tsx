import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Ticket, Copy, CalendarCheck } from "lucide-react";
import BirthdayRoulette from "@/components/BirthdayRoulette";

interface ClientBirthdayPreviewProps {
  onClose: () => void;
}

const MOCK_COUPONS = [
  {
    id: "mock-1",
    code: "ANIV-X9K2-M4JP",
    discount_type: "percent",
    discount_value: 40,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-2",
    code: "ANIV-R7L3-W5QN",
    discount_type: "percent",
    discount_value: 100,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const ClientBirthdayPreview = ({ onClose }: ClientBirthdayPreviewProps) => {
  const [showRoulette, setShowRoulette] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [alreadySpun, setAlreadySpun] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-background rounded-3xl border border-border shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative"
        >
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 border-b border-border flex items-center justify-between rounded-t-3xl">
            <div>
              <p className="font-body text-[11px] text-primary font-semibold tracking-wider uppercase">Simulação</p>
              <h2 className="font-heading text-base font-bold text-foreground">👁️ Visão do Cliente — Aniversário</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Simulated client page */}
          <div className="p-4 space-y-6">
            {/* Mini hero */}
            <div className="rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-primary-foreground/60 text-[10px] tracking-[0.3em] uppercase font-semibold">Minha conta</p>
                  <h3 className="font-heading text-lg font-bold">Meus Agendamentos</h3>
                </div>
              </div>
            </div>

            {/* Toggle buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { if (!alreadySpun) { setShowRoulette(true); setShowCoupons(false); } }}
                disabled={alreadySpun}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  alreadySpun
                    ? "border border-border text-muted-foreground opacity-50 cursor-not-allowed"
                    : showRoulette
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                🎰 {alreadySpun ? "Já girou" : "Roleta"}
              </button>
              <button
                onClick={() => { setShowCoupons(true); setShowRoulette(false); }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  showCoupons ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                🎁 Brindes
              </button>
            </div>

            {/* Roulette simulation */}
            {showRoulette && (
              <div className="text-center">
                <p className="font-body text-xs text-muted-foreground mb-3">
                  Isso é o que o cliente vê ao abrir o app no aniversário dele com a roleta ativa:
                </p>
                <button
                  onClick={() => setShowRoulette(true)}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-heading text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  🎰 Abrir Roleta (simulação)
                </button>
              </div>
            )}

            {/* Coupons preview - what client sees after spinning */}
            {showCoupons && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-5 h-5 text-primary" />
                  <h3 className="font-heading text-sm font-bold text-foreground">Meus Brindes</h3>
                </div>
                <p className="font-body text-xs text-muted-foreground mb-3">
                  Após girar a roleta, o brinde aparece aqui na página "Meus Agendamentos" até ser usado:
                </p>
                <div className="space-y-3">
                  {MOCK_COUPONS.map((coupon) => {
                    const isPercent = coupon.discount_type === "percent";
                    const discountLabel = isPercent
                      ? coupon.discount_value === 100
                        ? "Sessão Gratuita"
                        : `${coupon.discount_value}% de desconto`
                      : `R$ ${(coupon.discount_value / 100).toFixed(2).replace(".", ",")} de desconto`;
                    const expiresDate = new Date(coupon.expires_at).toLocaleDateString("pt-BR");

                    return (
                      <div
                        key={coupon.id}
                        className="bg-card rounded-2xl border border-primary/20 overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Ticket className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-heading text-xs font-bold text-foreground">🎁 Brinde de Aniversário</p>
                              <p className="font-body text-base font-bold text-primary">{discountLabel}</p>
                            </div>
                          </div>

                          <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">Código do cupom</p>
                              <p className="font-mono text-sm font-bold text-foreground tracking-wider">{coupon.code}</p>
                            </div>
                            <div className="p-1.5 rounded-lg bg-muted">
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          </div>

                          <p className="font-body text-[11px] text-muted-foreground mt-2">
                            📅 Válido até {expiresDate} • Use no checkout
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Roulette overlay */}
      {showRoulette && (
        <BirthdayRoulette testMode onClose={() => { setShowRoulette(false); setShowCoupons(true); setAlreadySpun(true); }} />
      )}
    </AnimatePresence>
  );
};

export default ClientBirthdayPreview;
