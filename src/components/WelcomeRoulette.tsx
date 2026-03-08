import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, X, Frown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RouletteSegment {
  label: string;
  type: "discount" | "none";
  value: number;
  color: string;
}

const COLORS = [
  "hsl(340, 82%, 52%)",
  "hsl(0, 0%, 45%)",
  "hsl(200, 80%, 50%)",
  "hsl(0, 0%, 40%)",
  "hsl(45, 90%, 50%)",
  "hsl(0, 0%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(0, 0%, 42%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 0%, 48%)",
];

// 10 segments: 4 prizes + 6 "no prize" = 60% chance of nothing
const SEGMENTS: RouletteSegment[] = [
  { label: "10% OFF", type: "discount", value: 10, color: COLORS[0] },
  { label: "Não foi dessa vez", type: "none", value: 0, color: COLORS[1] },
  { label: "15% OFF", type: "discount", value: 15, color: COLORS[2] },
  { label: "Tente na próxima", type: "none", value: 0, color: COLORS[3] },
  { label: "20% OFF", type: "discount", value: 20, color: COLORS[4] },
  { label: "Quase!", type: "none", value: 0, color: COLORS[5] },
  { label: "30% OFF", type: "discount", value: 30, color: COLORS[6] },
  { label: "Não foi dessa vez", type: "none", value: 0, color: COLORS[7] },
  { label: "Que pena!", type: "none", value: 0, color: COLORS[8] },
  { label: "Tente na próxima", type: "none", value: 0, color: COLORS[9] },
];

interface WelcomeRouletteProps {
  testMode?: boolean;
  onClose?: () => void;
}

const WelcomeRoulette = ({ testMode = false, onClose }: WelcomeRouletteProps) => {
  const { user } = useAuth();
  const [show, setShow] = useState(testMode);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteSegment | null>(null);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(!testMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (testMode) {
      setShow(true);
      drawWheel(0);
      return;
    }
    if (!user) return;
    checkEligibility();
  }, [user, testMode]);

  useEffect(() => {
    if (show) drawWheel(0);
  }, [show]);

  const checkEligibility = async () => {
    if (!user) return;
    setLoading(true);

    // Check if welcome roulette is enabled
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", ["welcome_roulette_enabled"]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.welcome_roulette_enabled !== "true") {
      setLoading(false);
      return;
    }

    // Check if user already spun (any coupon with BV- prefix)
    const { data: existingCoupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("user_id", user.id)
      .like("code", "BV-%")
      .limit(1);

    if (existingCoupon && existingCoupon.length > 0) {
      setLoading(false);
      return;
    }

    setShow(true);
    setLoading(false);
  };

  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const segments = SEGMENTS;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 4;
    const arc = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, size, size);

    segments.forEach((seg, i) => {
      const startAngle = i * arc + currentRotation;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${size < 300 ? 9 : 11}px sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      ctx.fillText(seg.label, radius - 14, 4);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "hsl(var(--primary))";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎰", center, center);
  };

  const spin = async () => {
    if (spinning || !user) return;
    setSpinning(true);
    setResult(null);

    const segments = SEGMENTS;
    const arc = (2 * Math.PI) / segments.length;

    // Weighted random: "none" segments have higher chance
    // Simply pick random segment - distribution is already 60% none / 40% prize
    const winIndex = Math.floor(Math.random() * segments.length);

    const targetRot = (3 * Math.PI / 2) - winIndex * arc - arc / 2;
    const jitter = (Math.random() - 0.5) * arc * 0.6;
    const fullSpins = (5 + Math.random() * 3) * 2 * Math.PI;
    const finalTarget = fullSpins + targetRot + jitter;

    const startRot = rotation;
    const totalRot = finalTarget - startRot;
    const duration = 4000;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRot + totalRot * eased;

      drawWheel(currentRot);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(currentRot);
        const pointerAngle = ((3 * Math.PI / 2) - currentRot) % (2 * Math.PI);
        const normalized = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const actualIndex = Math.floor(normalized / arc) % segments.length;
        const winner = segments[actualIndex];
        setResult(winner);
        saveCoupon(winner);
      }
    };

    requestAnimationFrame(animate);
  };

  const saveCoupon = async (winner: RouletteSegment) => {
    if (testMode) {
      setSpinning(false);
      if (winner.type === "none") {
        toast.info("😢 Teste! Não ganhou nada dessa vez.");
      } else {
        toast.success("🎉 Teste! Prêmio: " + `${winner.value}% OFF`);
      }
      return;
    }

    if (!user) return;

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BV-";
    if (winner.type === "none") {
      code += "NADA-";
    }
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (winner.type !== "none") {
      code += "-";
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("coupons").insert({
      code,
      user_id: user.id,
      discount_type: "percent",
      discount_value: winner.value,
      expires_at: expiresAt,
      is_used: winner.type === "none", // mark "none" as used immediately
    });

    if (error) {
      console.error("Error creating welcome coupon:", error);
      toast.error("Erro ao processar. Tente novamente.");
      setSpinning(false);
      return;
    }

    setSpinning(false);

    if (winner.type === "none") {
      toast.info("😢 Não foi dessa vez! Mas continue usando nosso app.");
    } else {
      toast.success("🎉 Parabéns! Seu cupom de boas-vindas foi gerado!");
    }
  };

  if (!testMode && (loading || !show)) return null;
  if (testMode && !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-card rounded-3xl border border-border shadow-2xl max-w-sm w-full p-6 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />

          <button
            onClick={() => { setShow(false); onClose?.(); }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="text-center mb-4 relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
            </motion.div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              🎰 Roleta de Boas-Vindas!
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Bem-vindo(a)! Gire a roleta e tente ganhar um desconto especial!
            </p>
          </div>

          {/* Wheel */}
          <div className="relative flex justify-center mb-4">
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
            </div>
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="w-[280px] h-[280px]"
            />
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center mb-4 p-4 rounded-2xl border ${
                  result.type === "none"
                    ? "bg-muted/50 border-border"
                    : "bg-primary/10 border-primary/20"
                }`}
              >
                {result.type === "none" ? (
                  <>
                    <Frown className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="font-heading text-base font-bold text-foreground">
                      Não foi dessa vez!
                    </p>
                    <p className="font-body text-sm text-muted-foreground mt-1">
                      Mas não desanime, temos ótimos serviços esperando por você! 💕
                    </p>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="font-heading text-base font-bold text-foreground">
                      Você ganhou!
                    </p>
                    <p className="font-body text-lg font-bold text-primary mt-1">
                      {result.value}% de desconto
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-2">
                      O cupom foi adicionado à sua conta. Use no checkout! 🎟️
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin button */}
          {!result && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={spin}
              disabled={spinning}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-heading text-base font-bold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {spinning ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Girando...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Girar a Roleta!
                </>
              )}
            </motion.button>
          )}

          {result && (
            <button
              onClick={() => { setShow(false); onClose?.(); }}
              className="w-full py-3 rounded-2xl border border-border text-foreground font-body text-sm font-semibold hover:bg-muted transition-all"
            >
              Fechar
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeRoulette;
