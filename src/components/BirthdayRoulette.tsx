import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, PartyPopper, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RouletteSegment {
  label: string;
  type: "discount" | "session";
  value: number; // percent for discount, 0 for session
  serviceTitle?: string;
  color: string;
}

const COLORS = [
  "hsl(340, 82%, 52%)",
  "hsl(280, 60%, 55%)",
  "hsl(200, 80%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(15, 85%, 55%)",
  "hsl(320, 70%, 50%)",
  "hsl(220, 70%, 55%)",
  "hsl(170, 65%, 45%)",
  "hsl(50, 80%, 48%)",
  "hsl(0, 75%, 55%)",
  "hsl(260, 55%, 55%)",
];

interface BirthdayRouletteProps {
  testMode?: boolean;
  onClose?: () => void;
}

const BirthdayRoulette = ({ testMode = false, onClose }: BirthdayRouletteProps) => {
  const { user } = useAuth();
  const [show, setShow] = useState(testMode);
  const [segments, setSegments] = useState<RouletteSegment[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RouletteSegment | null>(null);
  const [rotation, setRotation] = useState(0);
  const [alreadySpun, setAlreadySpun] = useState(false);
  const [loading, setLoading] = useState(!testMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (testMode) {
      loadSegments();
      return;
    }
    if (!user) return;
    checkBirthdayAndSetup();
  }, [user, testMode]);

  const loadSegments = async () => {
    const { data: servicesData } = await supabase
      .from("services")
      .select("slug, title")
      .eq("is_active", true)
      .order("sort_order")
      .limit(6);

    const segs: RouletteSegment[] = [];
    const discounts = [10, 20, 30, 40, 50, 60];
    discounts.forEach((d, i) => {
      segs.push({
        label: `${d}% OFF`,
        type: "discount",
        value: d,
        color: COLORS[i % COLORS.length],
      });
    });

    (servicesData || []).slice(0, 4).forEach((s, i) => {
      segs.push({
        label: `Sessão ${s.title.length > 12 ? s.title.substring(0, 12) + "…" : s.title}`,
        type: "session",
        value: 0,
        serviceTitle: s.title,
        color: COLORS[(6 + i) % COLORS.length],
      });
    });

    setSegments(segs);
    setShow(true);
  };

  const checkBirthdayAndSetup = async () => {
    if (!user) return;
    setLoading(true);

    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", ["birthday_roulette_enabled"]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.birthday_roulette_enabled !== "true") {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.birth_date) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const todayMonth = String(brt.getUTCMonth() + 1).padStart(2, "0");
    const todayDay = String(brt.getUTCDate()).padStart(2, "0");
    const [, m, d] = profile.birth_date.split("-");

    if (m !== todayMonth || d !== todayDay) {
      setLoading(false);
      return;
    }

    const todayStr = `${brt.getUTCFullYear()}-${todayMonth}-${todayDay}`;
    const { data: existingCoupon } = await supabase
      .from("coupons")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", `${todayStr}T00:00:00`)
      .lte("created_at", `${todayStr}T23:59:59`)
      .limit(1);

    if (existingCoupon && existingCoupon.length > 0) {
      setAlreadySpun(true);
      setLoading(false);
      return;
    }

    await loadSegments();
    setLoading(false);
  };

  useEffect(() => {
    if (segments.length === 0) return;
    drawWheel(0);
  }, [segments]);

  const drawWheel = (currentRotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${size < 300 ? 10 : 12}px sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      ctx.fillText(seg.label, radius - 14, 4);
      ctx.restore();
    });

    // Center circle
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
    ctx.fillText("🎁", center, center);
  };

  const spin = async () => {
    if (spinning || segments.length === 0 || !user) return;
    setSpinning(true);
    setResult(null);

    // Pick random segment
    const winIndex = Math.floor(Math.random() * segments.length);
    const arc = (2 * Math.PI) / segments.length;
    // Spin 5-8 full rotations + land on winIndex
    const fullRotations = (5 + Math.random() * 3) * 2 * Math.PI;
    // The pointer is at top (negative y), so segment center should be at -PI/2
    const targetAngle = -winIndex * arc - arc / 2 - Math.PI / 2;
    const finalRotation = fullRotations + targetAngle - (rotation % (2 * Math.PI));

    const startRot = rotation;
    const totalRot = finalRotation;
    const duration = 4000;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRot = startRot + totalRot * eased;

      drawWheel(currentRot);
      setRotation(currentRot);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setRotation(currentRot);
        const winner = segments[winIndex];
        setResult(winner);
        generateCoupon(winner);
      }
    };

    requestAnimationFrame(animate);
  };

  const generateCoupon = async (winner: RouletteSegment) => {
    if (!user) return;

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ANIV-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    code += "-";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (winner.type === "discount") {
      const { error } = await supabase.from("coupons").insert({
        code,
        user_id: user.id,
        discount_type: "percent",
        discount_value: winner.value,
        expires_at: expiresAt,
      });

      if (error) {
        console.error("Error creating coupon:", error);
        toast.error("Erro ao gerar seu cupom. Tente novamente.");
        setSpinning(false);
        return;
      }
    } else {
      // Free session - store as 100% discount with service info in code
      const { error } = await supabase.from("coupons").insert({
        code,
        user_id: user.id,
        discount_type: "percent",
        discount_value: 100,
        expires_at: expiresAt,
      });

      if (error) {
        console.error("Error creating session coupon:", error);
        toast.error("Erro ao gerar seu cupom. Tente novamente.");
        setSpinning(false);
        return;
      }
    }

    setAlreadySpun(true);
    setSpinning(false);
    toast.success("🎉 Parabéns! Seu prêmio foi gerado!");
  };

  if (loading || !show || alreadySpun) return null;

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
          {/* Decorative */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />

          <button
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="text-center mb-4 relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <PartyPopper className="w-8 h-8 text-primary mx-auto mb-2" />
            </motion.div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              🎂 Feliz Aniversário!
            </h2>
            <p className="font-body text-sm text-muted-foreground mt-1">
              Gire a roleta e ganhe um presente especial!
            </p>
          </div>

          {/* Wheel */}
          <div className="relative flex justify-center mb-4">
            {/* Pointer */}
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
                className="text-center mb-4 p-4 rounded-2xl bg-primary/10 border border-primary/20"
              >
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-heading text-base font-bold text-foreground">
                  Você ganhou!
                </p>
                <p className="font-body text-lg font-bold text-primary mt-1">
                  {result.type === "discount"
                    ? `${result.value}% de desconto`
                    : `Sessão gratuita de ${result.serviceTitle}`}
                </p>
                <p className="font-body text-xs text-muted-foreground mt-2">
                  O cupom foi adicionado à sua conta. Use no checkout! 🎟️
                </p>
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
              onClick={() => setShow(false)}
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

export default BirthdayRoulette;
