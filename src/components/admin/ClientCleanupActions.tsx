import { useState } from "react";
import { Database, Loader2, Smile } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Action = "space" | "names";

export default function ClientCleanupActions({ onNamesCleaned }: { onNamesCleaned: () => void }) {
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [running, setRunning] = useState<Action | null>(null);

  const run = async (action: Action) => {
    if (running) return;
    setRunning(action);
    try {
      if (action === "space") {
        const { data, error } = await supabase.rpc("system_maintenance");
        if (error) throw error;
        const counts = data as Record<string, number>;
        const total = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
        toast.success(`Limpeza concluída: ${total} registros técnicos antigos removidos. Dados dos clientes preservados.`);
      } else {
        const { data, error } = await supabase.rpc("clean_client_name_emojis");
        if (error) throw error;
        const result = data as { updated: number; skipped: number };
        toast.success(`${result.updated} nomes atualizados, sem emojis.`);
        if (result.skipped > 0) toast.info(`${result.skipped} nomes preservados por estarem protegidos ou ficarem vazios. Revise-os individualmente.`);
        onNamesCleaned();
      }
    } catch {
      toast.error("Não foi possível concluir a limpeza. Confira sua conexão e seu acesso de administrador.");
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <Button variant="outline" disabled={running !== null} onClick={() => setConfirm("space")} className="gap-2">
          {running === "space" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          {running === "space" ? "Limpando..." : "Liberar espaço no banco"}
        </Button>
        <Button variant="outline" disabled={running !== null} onClick={() => setConfirm("names")} className="gap-2">
          {running === "names" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smile className="h-4 w-4" />}
          {running === "names" ? "Limpando nomes..." : "Remover emojis dos nomes"}
        </Button>
      </div>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "space" ? "Liberar espaço com segurança?" : "Remover emojis dos nomes?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "space"
                ? "Serão removidos somente registros técnicos antigos. Clientes, fichas, anamneses, fotos, agenda e caixa não serão apagados. O espaço é reaproveitado pelo banco; a redução do tamanho total pode não ser imediata."
                : "Os emojis serão removidos dos nomes salvos de todos os clientes. Os demais dados serão mantidos. Nomes que ficariam vazios e cadastros protegidos serão preservados para revisão."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirm) void run(confirm); }}>Confirmar limpeza</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}