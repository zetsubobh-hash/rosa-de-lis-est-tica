import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PartnerFinancialReset({ partnerId, partnerName, onReset }: { partnerId: string; partnerName: string; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (busy || !password) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-partner-financials", { body: { partner_id: partnerId, password } });
      if (error || !data?.success) {
        let message = data?.error;
        if (error?.context instanceof Response) message = (await error.context.json()).error;
        throw new Error(message || "Não foi possível limpar. Confira sua senha e conexão.");
      }
      toast.success("Dados financeiros do parceiro limpos.");
      setConfirm(false);
      onReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a limpeza.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  };
  return <div className="space-y-3 border-t border-border pt-4">
    <Button type="button" variant="destructive" className="w-full gap-2 whitespace-normal h-auto min-h-10" disabled={busy} onClick={() => { setConfirm(true); setPassword(""); }}><Trash2 className="h-4 w-4 shrink-0" />Limpar dados financeiros</Button>
    {confirm && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void reset(); }}>
      <p className="text-sm text-destructive">Apagar todos os pagamentos, adiantamentos, bônus e descontos de {partnerName} e zerar salário e comissão? Esta ação não pode ser desfeita e altera os totais do caixa. Cadastro, agenda, fichas e fotos serão mantidos.</p>
      <Input aria-label="Senha do administrador" type="password" autoComplete="current-password" placeholder="Senha do administrador" value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setConfirm(false); setPassword(""); }}>Cancelar limpeza</Button>
        <Button type="submit" variant="destructive" disabled={busy || !password} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar limpeza</Button>
      </div>
    </form>}
  </div>;
}