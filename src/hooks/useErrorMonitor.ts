import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CapturedError {
  message: string;
  source: string;
  timestamp: string;
}

/**
 * Global error monitor that captures JS errors and unhandled promise rejections,
 * batches them, and sends to the error-monitor edge function every 30 seconds.
 */
export const useErrorMonitor = () => {
  const errorQueue = useRef<CapturedError[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pushError = (message: string, source: string) => {
      // Deduplicate: don't add if same message already queued
      if (errorQueue.current.some((e) => e.message === message)) return;
      errorQueue.current.push({
        message: message.slice(0, 300),
        source: source.slice(0, 200),
        timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      });
    };

    const handleError = (event: ErrorEvent) => {
      pushError(
        event.message || "Erro JS desconhecido",
        `${event.filename || window.location.pathname}:${event.lineno || "?"}`
      );
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString?.() || "Promise rejection";
      pushError(msg, window.location.pathname);
    };

    // Flush queue to edge function
    const flush = async () => {
      if (errorQueue.current.length === 0) return;
      const errors = [...errorQueue.current];
      errorQueue.current = [];
      try {
        await supabase.functions.invoke("error-monitor", {
          body: { errors },
        });
      } catch {
        // Silent fail — monitor should never break the app
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    timerRef.current = setInterval(flush, 30_000);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      if (timerRef.current) clearInterval(timerRef.current);
      // Flush remaining on unmount
      if (errorQueue.current.length > 0) {
        const errors = [...errorQueue.current];
        errorQueue.current = [];
        supabase.functions.invoke("error-monitor", { body: { errors } }).catch(() => {});
      }
    };
  }, []);
};
