import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Phone, X, BellOff, BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";

const SETTING_KEY = "missing_phone_alert_enabled";

export const isPhoneMissing = (phone?: string | null) =>
  (phone || "").replace(/\D/g, "").length < 10;

const maskPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

interface ClientLike {
  user_id: string;
  full_name: string;
  phone: string;
}

interface Props {
  clients: ClientLike[];
  onFixed: (userId: string, phone: string) => void;
}

const MissingPhoneAlert = ({ clients, onFixed }: Props) => {
  const { settings, loading, updateSetting } = useSiteSettings();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setEnabled((settings[SETTING_KEY] ?? "true") === "true");
  }, [loading, settings]);

  const missing = useMemo(
    () => clients.filter((c) => isPhoneMissing(c.phone)),
    [clients]
  );

  const toggle = async (val: boolean) => {
    setEnabled(val);
    if (!val) setOpen(false);
    const { error } = await updateSetting(SETTING_KEY, val ? "true" : "false");
    if (error) {
      setEnabled(!val);
      toast.error("Erro ao salvar a preferência.");
      return;
    }
    toast.success(val ? "Aviso de telefone ativado." : "Aviso de telefone desativado.");
  };

  const save = async (client: ClientLike) => {
    const raw = (drafts[client.user_id] || "").replace(/\D/g, "");
    if (raw.length < 10) {
      toast.error("Informe um telefone válido com DDD.");
      return;
    }
    setSavingId(client.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: raw, updated_at: new Date().toISOString() })
      .eq("user_id", client.user_id);
    setSavingId(null);
    if (error) {
      toast.error("Não foi possível salvar o telefone.");
      return;
    }
    toast.success(`Telefone de ${client.full_name} atualizado!`);
    onFixed(client.user_id, raw);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[client.user_id];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {enabled ? (
            <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold text-foreground">
              Aviso de cadastros sem telefone
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Alerta o admin quando existem clientes sem telefone válido.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {/* Alert banner */}
      {enabled && missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="font-body text-sm text-foreground">
                <strong>{missing.length}</strong> cadastro{missing.length !== 1 ? "s" : ""} sem
                telefone — essencial para agendamentos e WhatsApp.
              </p>
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              className="h-9 px-3 rounded-lg bg-amber-500 text-white font-body text-xs font-semibold hover:bg-amber-600 transition-colors shrink-0"
            >
              {open ? "Fechar" : "Corrigir agora"}
            </button>
          </div>

          {open && (
            <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
              {missing.map((c) => (
                <div
                  key={c.user_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-background border border-border p-2"
                >
                  <p className="font-body text-sm text-foreground flex-1 truncate">
                    {c.full_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-44">
                      <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={maskPhone(drafts[c.user_id] || "")}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [c.user_id]: e.target.value }))
                        }
                        placeholder="(31) 99999-9999"
                        inputMode="numeric"
                        className="w-full h-9 pl-8 pr-2 rounded-lg border border-border bg-background font-body text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => save(c)}
                      disabled={savingId === c.user_id}
                      className="h-9 px-3 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {enabled && missing.length === 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-body text-xs text-foreground">
            Todos os cadastros possuem telefone válido.
          </p>
        </div>
      )}
    </div>
  );
};

export default MissingPhoneAlert;
