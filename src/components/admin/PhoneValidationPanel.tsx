import { useState } from "react";
import { PhoneCall, Loader2, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/agendaClients";
import { nationalDigits, phoneFormatProblem, PHONE_PROBLEM_LABEL, type PhoneProblem } from "@/lib/phoneValidation";

type Row = { user_id: string; full_name: string; phone: string };
type Issue = Row & { problem: PhoneProblem | "sem_whatsapp" };

/** Validates every client phone: format first, then WhatsApp existence via the active instance. */
const PhoneValidationPanel = ({ onOpenClient }: { onOpenClient: (userId: string) => void }) => {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [checkedWa, setCheckedWa] = useState(0);

  const run = async () => {
    setRunning(true);
    setIssues(null);
    setProgress("Carregando clientes...");
    const { data, error } = await fetchAllPages<Row, { message: string }>((from, to) =>
      supabase.from("profiles").select("user_id, full_name, phone").order("full_name").range(from, to)
    );
    if (error || !data) {
      toast.error("Erro ao carregar clientes");
      setRunning(false);
      return;
    }
    const found: Issue[] = [];
    const valid: Row[] = [];
    for (const r of data) {
      const p = phoneFormatProblem(r.phone);
      if (p) found.push({ ...r, problem: p });
      else valid.push(r);
    }
    // WhatsApp check in batches of 50, one request per unique number
    const byNumber = new Map<string, Row[]>();
    for (const r of valid) {
      const n = "55" + nationalDigits(r.phone);
      byNumber.set(n, [...(byNumber.get(n) ?? []), r]);
    }
    const nums = [...byNumber.keys()];
    let done = 0;
    let waError = "";
    for (let i = 0; i < nums.length; i += 50) {
      setProgress(`Verificando WhatsApp ${Math.min(i + 50, nums.length)} de ${nums.length}...`);
      const batch = nums.slice(i, i + 50);
      const { data: res, error: fnErr } = await supabase.functions.invoke("check-whatsapp-numbers", { body: { numbers: batch } });
      if (fnErr || !res?.exists) {
        waError = (res as { error?: string })?.error || "Não foi possível consultar o WhatsApp";
        break;
      }
      for (const n of batch) if (res.exists[n] === false) byNumber.get(n)!.forEach((r) => found.push({ ...r, problem: "sem_whatsapp" }));
      done += batch.length;
    }
    if (waError) toast.error(`Formato verificado. WhatsApp: ${waError}`);
    found.sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
    setCheckedWa(done);
    setIssues(found);
    setProgress(`${data.length} clientes verificados`);
    setRunning(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={run} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
          Validar telefones dos clientes
        </Button>
        {progress && <span className="font-body text-xs text-muted-foreground">{progress}</span>}
        {issues && (
          <button onClick={() => { setIssues(null); setProgress(""); }} className="ml-auto text-muted-foreground" aria-label="Fechar resultado">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {issues && (
        <div className="space-y-2">
          <p className="font-body text-sm">
            {issues.length === 0
              ? "Todos os telefones estão corretos."
              : `${issues.length} cliente(s) com problema no telefone.`}
            {checkedWa > 0 && <span className="text-muted-foreground"> ({checkedWa} números consultados no WhatsApp)</span>}
          </p>
          {issues.length > 0 && (
            <div className="max-h-80 overflow-auto divide-y divide-border rounded-xl border border-border">
              {issues.map((i, idx) => (
                <button
                  key={i.user_id + i.problem}
                  onClick={() => onOpenClient(i.user_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <span className="font-body text-xs text-muted-foreground w-8 shrink-0">{idx + 1}</span>
                  <span className="font-body text-sm flex-1 min-w-0 truncate">{i.full_name}</span>
                  <span className="font-body text-xs text-muted-foreground hidden sm:inline">{i.phone || "—"}</span>
                  <span className="shrink-0 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-medium flex items-center gap-1">
                    {i.problem === "sem_whatsapp" && <MessageCircle className="w-3 h-3" />}
                    {PHONE_PROBLEM_LABEL[i.problem]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhoneValidationPanel;
