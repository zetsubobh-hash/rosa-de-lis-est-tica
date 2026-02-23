import { useState, useEffect } from "react";
import { Bug, Phone, Save, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const KEYS = ["debug_monitor_enabled", "debug_monitor_phone"];

const AdminDebugMonitor = () => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("key, value")
        .in("key", KEYS);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = r.value; });
      setEnabled(map.debug_monitor_enabled === "true");
      setPhone(map.debug_monitor_phone || "");
      setLoading(false);
    };
    load();
  }, []);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updates = [
      { key: "debug_monitor_enabled", value: enabled ? "true" : "false" },
      { key: "debug_monitor_phone", value: phone.replace(/\D/g, "") },
    ];

    for (const u of updates) {
      const { data: existing } = await supabase
        .from("payment_settings")
        .select("id")
        .eq("key", u.key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("payment_settings")
          .update({ value: u.value, updated_by: user?.id, updated_at: new Date().toISOString() })
          .eq("key", u.key);
      } else {
        await supabase
          .from("payment_settings")
          .insert({ key: u.key, value: u.value, updated_by: user?.id });
      }
    }

    toast({ title: "Configurações salvas!", description: "Monitor de debug atualizado." });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-destructive" />
            Monitor de Erros em Tempo Real
          </CardTitle>
          <CardDescription>
            Captura erros JavaScript automaticamente e envia notificação via WhatsApp quando um bug é detectado no site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
            <div className="flex items-center gap-3">
              <Power className={`w-5 h-5 ${enabled ? "text-green-500" : "text-muted-foreground"}`} />
              <div>
                <Label className="font-semibold">Ativar Monitor</Label>
                <p className="text-xs text-muted-foreground">
                  Erros serão enviados a cada 30 segundos via WhatsApp
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Telefone para Notificação
            </Label>
            <Input
              placeholder="(11) 99999-9999"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Número que receberá as notificações de erro via WhatsApp
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">⚠️ Requisito:</strong> A integração Evolution API deve estar ativa e conectada na aba WhatsApp para que as notificações funcionem.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDebugMonitor;
