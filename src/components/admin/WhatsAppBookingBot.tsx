import { useEffect, useState } from "react";
import { Bot, Loader2, Link2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

/** Admin panel: on/off switch and name for the WhatsApp booking robot. */
const WhatsAppBookingBot = () => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState("Lis");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("payment_settings").select("key,value").in("key", ["whatsapp_bot_enabled", "whatsapp_bot_name"]).then(({ data }) => {
      data?.forEach((r) => {
        if (r.key === "whatsapp_bot_enabled") setEnabled(r.value === "true");
        if (r.key === "whatsapp_bot_name") setName(r.value || "Lis");
      });
      setLoading(false);
    });
  }, []);

  const save = async (key: string, value: string) => {
    const { error } = await supabase.from("payment_settings").upsert({ key, value }, { onConflict: "key" });
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    return !error;
  };

  const connect = async () => {
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/evolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({ action: "set_bot_webhook" }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && out.success) toast({ title: "Robô conectado ao WhatsApp ✅" });
    else toast({ title: "Não foi possível conectar", description: out.error || "Verifique se o WhatsApp está conectado.", variant: "destructive" });
    return res.ok && out.success;
  };

  const toggle = async (v: boolean) => {
    setEnabled(v);
    if (!(await save("whatsapp_bot_enabled", v ? "true" : "false"))) return setEnabled(!v);
    if (v) await connect();
    else toast({ title: "Robô desligado" });
  };

  if (loading) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bot className={`w-5 h-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="font-heading text-sm font-bold text-foreground">Robô de Agendamento {enabled ? "Ligado" : "Desligado"}</p>
            <p className="font-body text-xs text-muted-foreground">Atende clientes no WhatsApp e marca horários sozinho</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      <div className="space-y-1">
        <label className="font-body text-xs text-muted-foreground">Nome do robô</label>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" />
          <button onClick={async () => { if (await save("whatsapp_bot_name", name.trim() || "Lis")) toast({ title: "Nome salvo" }); }}
            className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm flex items-center gap-1">
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>

      <ul className="font-body text-xs text-muted-foreground list-disc pl-4 space-y-1">
        <li>Se apresenta como <b>{name || "Lis"}</b> e avisa que é um atendimento por robô.</li>
        <li>Conhece todos os serviços ativos. Serviços novos entram automaticamente.</li>
        <li>Respeita profissionais, dias de trabalho e número de salas.</li>
        <li>Se a cliente pedir "atendente", passa a conversa para a equipe. Ela volta ao robô escrevendo o nome dele.</li>
      </ul>

      {enabled && (
        <button onClick={connect} disabled={busy} className="text-xs text-primary flex items-center gap-1">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />} Reconectar robô ao WhatsApp
        </button>
      )}
    </div>
  );
};

export default WhatsAppBookingBot;
