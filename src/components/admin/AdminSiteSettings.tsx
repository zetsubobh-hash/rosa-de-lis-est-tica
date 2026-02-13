import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, MapPin, Phone, Instagram, Building2 } from "lucide-react";

const AdminSiteSettings = () => {
  const { settings, loading, updateSetting } = useSiteSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loading && Object.keys(settings).length > 0) {
    setForm(settings);
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of Object.keys(form)) {
        if (form[key] !== settings[key]) {
          const { error } = await updateSetting(key, form[key]);
          if (error) throw error;
        }
      }
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const fields = [
    { key: "business_name", label: "Nome do Negócio", icon: Building2, placeholder: "Rosa de Lis Estética" },
    { key: "phone", label: "Telefone", icon: Phone, placeholder: "(31) 99999-9999" },
    { key: "address", label: "Endereço", icon: MapPin, placeholder: "Rua..., Nº - Bairro, Cidade - UF, CEP" },
    { key: "instagram_url", label: "Link do Instagram", icon: Instagram, placeholder: "https://instagram.com/rosadelis" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="font-body text-sm text-muted-foreground">
        Essas informações aparecem no rodapé do site e em outros locais públicos.
      </p>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="flex items-center gap-2 font-body text-sm font-medium">
              <field.icon className="w-4 h-4 text-primary" />
              {field.label}
            </Label>
            <Input
              value={form[field.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="font-body"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};

export default AdminSiteSettings;
