import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, MapPin, Phone, Instagram, Building2, Clock, MessageCircle } from "lucide-react";

const formatWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, "");
  // Remove leading 55 if user types it (we add it automatically)
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  const d = local.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const whatsAppToRaw = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  return local.length > 0 ? `55${local.slice(0, 11)}` : "";
};

const AdminSiteSettings = () => {
  const { settings, loading, updateSetting } = useSiteSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && !loading && Object.keys(settings).length > 0) {
    const formatted = { ...settings };
    // Display whatsapp as masked
    if (formatted.whatsapp_number) {
      formatted.whatsapp_number = formatWhatsApp(formatted.whatsapp_number);
    }
    setForm(formatted);
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of Object.keys(form)) {
        const value = key === "whatsapp_number" ? whatsAppToRaw(form[key]) : form[key];
        if (value !== settings[key]) {
          const { error } = await updateSetting(key, value);
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
    { key: "whatsapp_number", label: "Número do WhatsApp (botão flutuante)", icon: MessageCircle, placeholder: "(31) 99999-9999", mask: "whatsapp" },
    { key: "address", label: "Endereço", icon: MapPin, placeholder: "Rua..., Nº - Bairro, Cidade - UF, CEP" },
    { key: "business_hours", label: "Horário de Funcionamento", icon: Clock, placeholder: "Seg a Sex: 8h às 20h | Sáb: 8h às 14h" },
    { key: "instagram_url", label: "Link do Instagram", icon: Instagram, placeholder: "https://instagram.com/rosadelis" },
    { key: "google_place_id", label: "Google Place ID", icon: MapPin, placeholder: "ChIJ... (ID do Google Maps)" },
    { key: "google_api_key", label: "Google Places API Key", icon: Building2, placeholder: "AIzaSy... (chave da API do Google)" },
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
            {field.key === "google_place_id" && (
              <p className="font-body text-xs text-muted-foreground">
                Encontre o Place ID do seu estabelecimento em{" "}
                <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google Place ID Finder
                </a>
              </p>
            )}
            {field.key === "google_api_key" && (
              <p className="font-body text-xs text-muted-foreground">
                Crie uma chave na{" "}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google Cloud Console
                </a>
                {" "}com a API "Places API" ativada.
              </p>
            )}
            {(field as any).mask === "whatsapp" && (
              <p className="font-body text-xs text-muted-foreground">O código +55 (Brasil) é adicionado automaticamente.</p>
            )}
            <div className="relative">
              {(field as any).mask === "whatsapp" && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground pointer-events-none">+55</span>
              )}
              <Input
                value={form[field.key] ?? ""}
                onChange={(e) => {
                  if ((field as any).mask === "whatsapp") {
                    setForm((prev) => ({ ...prev, [field.key]: formatWhatsApp(e.target.value) }));
                  } else {
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }));
                  }
                }}
                placeholder={field.placeholder}
                className={`font-body ${(field as any).mask === "whatsapp" ? "pl-12" : ""}`}
                type={field.key === "google_api_key" ? "password" : "text"}
                maxLength={(field as any).mask === "whatsapp" ? 15 : undefined}
              />
            </div>
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
