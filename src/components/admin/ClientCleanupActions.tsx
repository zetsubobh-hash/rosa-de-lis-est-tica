import { useState } from "react";
import { Loader2, Smile } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Action = "names";

export default function ClientCleanupActions({ onNamesCleaned }: { onNamesCleaned: () => void }) {
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [running, setRunning] = useState<Action | null>(null);

  const run = async (action: Action) => {
    if (running) return;
    setRunning(action);
    try {
      {
        const { data, error } = await supabase.rpc("clean_client_name_emojis");
        if (error) throw error;
        const result = data as { updated: number; skipped: number };
        toast.success(`${result.updated} nomes atualizados, sem emojis ou espaços em branco no início e no fim.`);
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
        <Button variant="outline" disabled={running !== null} onClick={() => setConfirm("names")} className="gap-2">
          {running === "names" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smile className="h-4 w-4" />}
          {running === "names" ? "Limpando nomes..." : "Limpar espaços e emojis dos nomes"}
        </Button>
      </div>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar espaços e emojis dos nomes?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidos os espaços em branco antes e depois dos nomes e os emojis de todos os clientes. Espaços repetidos entre palavras serão reduzidos a um. Fichas, anamneses, fotos e demais dados serão mantidos. Nomes que ficariam vazios e cadastros protegidos serão preservados para revisão.
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