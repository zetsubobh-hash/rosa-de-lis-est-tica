import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

const Cancelar = () => {
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";
  const [phone, setPhone] = useState(phoneParam);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (phoneParam) setPhone(phoneParam);
  }, [phoneParam]);

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("55")) return digits;
    if (digits.length >= 10) return "55" + digits;
    return digits;
  };

  const formatDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const local = digits.startsWith("55") ? digits.slice(2) : digits;
    const d = local.slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleUnsubscribe = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 12) {
      setErrorMsg("Informe um número de telefone válido.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("promo_unsubscribes" as any)
        .insert({ phone: normalized } as any);

      if (error) {
        if (error.code === "23505") {
          // Already unsubscribed (unique constraint)
          setStatus("success");
          return;
        }
        throw error;
      }

      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar o cancelamento.");
      setStatus("error");
    }
  };

  // Auto-unsubscribe when phone comes via URL
  useEffect(() => {
    if (phoneParam && phoneParam.length >= 10 && status === "idle") {
      handleUnsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneParam]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center space-y-6 shadow-lg">
          {status === "success" ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">Inscrição cancelada</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Você não receberá mais mensagens promocionais no número informado.
                  Se mudar de ideia, é só nos visitar! 💕
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MailX className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-foreground">Cancelar recebimento</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Informe seu número de WhatsApp para deixar de receber promoções.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="tel"
                  value={phone.length > 0 && !phone.startsWith("(") ? formatDisplay(phone) : phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setStatus("idle");
                    setErrorMsg("");
                  }}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                {status === "error" && errorMsg && (
                  <div className="flex items-center justify-center gap-2 text-destructive text-sm">
                    <XCircle className="w-4 h-4" />
                    {errorMsg}
                  </div>
                )}

                <Button
                  onClick={handleUnsubscribe}
                  disabled={status === "loading"}
                  size="lg"
                  variant="destructive"
                  className="w-full gap-2"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MailX className="w-5 h-5" />
                  )}
                  {status === "loading" ? "Processando..." : "Cancelar inscrição"}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Conforme a LGPD, você tem o direito de cancelar o recebimento de mensagens promocionais a qualquer momento.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Cancelar;
