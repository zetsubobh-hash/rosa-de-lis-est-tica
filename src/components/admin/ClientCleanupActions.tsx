import { useState } from "react";
import { Loader2, Smile, Eraser } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Action = "names" | "prefixes";

export default function ClientCleanupActions({ onNamesCleaned }: { onNamesCleaned: () => void }) {
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [running, setRunning] = useState<Action | null>(null);

  const run = async (action: Action) => {
    if (running) return;
    setRunning(action);
    try {
      {
        const { data, error } = await supabase.rpc(action === "prefixes" ? "clean_client_name_prefixes" : "clean_client_name_emojis");
        if (error) throw error;
        const result = data as { updated: number; skipped: number };
        toast.success(action === "prefixes"
          ? `${result.updated} nomes atualizados, sem sinais no início.`
          : `${result.updated} nomes atualizados, sem emojis ou espaços em branco no início e no fim.`);
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
        <Button variant="outline" disabled={running !== null} onClick={() => setConfirm("prefixes")} className="gap-2 whitespace-normal text-left h-auto min-h-10">
          {running === "prefixes" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Eraser className="h-4 w-4 shrink-0" />}
          {running === "prefixes" ? "Limpando nomes..." : "Limpar sinais no início dos nomes"}
        </Button>
      </div>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "prefixes" ? "Limpar sinais no início dos nomes?" : "Limpar espaços e emojis dos nomes?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "prefixes"
                ? "Serão removidos somente hífen (-), vírgula (,), til (~), ponto (.) e espaços em branco no início dos nomes de todos os clientes. Esses sinais no meio ou no fim dos nomes serão mantidos."
                : "Serão removidos os espaços em branco antes e depois dos nomes e os emojis de todos os clientes. Espaços repetidos entre palavras serão reduzidos a um."}
              {" "}Fichas, anamneses, fotos e demais dados serão mantidos. Nomes que ficariam vazios e cadastros protegidos serão preservados para revisão.
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