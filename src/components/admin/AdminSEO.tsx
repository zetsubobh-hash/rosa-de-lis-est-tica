import { useState, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Save,
  BarChart3,
  Search,
  MapPin,
  Globe,
  FileText,
  Image,
  Info,
  Upload,
  Trash2,
  Check,
} from "lucide-react";

const AdminSEO = () => {
  const { settings, loading, updateSetting } = useSiteSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ogPreview, setOgPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!initialized && !loading) {
    setForm({ ...settings });
    setOgPreview(settings.seo_og_image || null);
    setInitialized(true);
  }

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `og-image.${ext}`;
      await supabase.storage.from("branding").remove([path]);
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setForm((prev) => ({ ...prev, seo_og_image: publicUrl }));
      setOgPreview(publicUrl);
      toast.success("Imagem carregada! Clique em Salvar para aplicar.");
    } catch {
      toast.error("Erro ao enviar imagem.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveOg = () => {
    setForm((prev) => ({ ...prev, seo_og_image: "" }));
    setOgPreview(null);
  };

  const handleSaveField = async (key: string) => {
    setSavingKey(key);
    try {
      const value = form[key] ?? "";
      const { error } = await updateSetting(key, value);
      if (error) throw error;
      toast.success("Salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar.");
    }
    setSavingKey(null);
  };

  const isChanged = (key: string) => (form[key] ?? "") !== (settings[key] ?? "");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const fields = [
    {
      key: "seo_meta_title",
      label: "Título do Site (Meta Title)",
      icon: FileText,
      placeholder: "Rosa de Lis Estética — Tratamentos Faciais e Corporais",
      type: "text",
      help: "Aparece na aba do navegador e nos resultados do Google. Ideal: até 60 caracteres com sua palavra-chave principal.",
    },
    {
      key: "seo_meta_description",
      label: "Descrição do Site (Meta Description)",
      icon: FileText,
      placeholder: "Clínica de estética especializada em tratamentos faciais, corporais e bem-estar. Agende sua avaliação!",
      type: "textarea",
      help: "Texto exibido abaixo do título nos resultados de busca do Google. Ideal: até 160 caracteres.",
    },
    {
      key: "seo_og_image",
      label: "Imagem de Compartilhamento (OG Image)",
      icon: Image,
      placeholder: "",
      type: "upload",
      help: "Imagem que aparece quando o site é compartilhado no WhatsApp, Facebook, Instagram e outras redes. Tamanho recomendado: 1200×630 pixels.",
    },
    {
      key: "seo_google_analytics_id",
      label: "Google Analytics (ID de Medição)",
      icon: BarChart3,
      placeholder: "G-XXXXXXXXXX",
      type: "text",
      help: 'Insira o ID de medição do Google Analytics 4 (começa com "G-"). Acompanhe visitantes, páginas mais acessadas, origem do tráfego e conversões.',
      link: { url: "https://analytics.google.com/", text: "Abrir Google Analytics" },
      steps: ["Acesse analytics.google.com e crie uma conta/propriedade", 'Vá em Admin → Fluxos de dados → Web → copie o "ID de Medição"', "Cole o ID no campo acima"],
    },
    {
      key: "seo_google_search_console",
      label: "Google Search Console (Meta Tag de Verificação)",
      icon: Search,
      placeholder: "XXXXXXXXXXXXX",
      type: "text",
      help: 'Cole apenas o valor do content da meta tag de verificação. Monitore como o Google indexa seu site.',
      link: { url: "https://search.google.com/search-console/", text: "Abrir Google Search Console" },
      steps: ["Acesse search.google.com/search-console e adicione seu site", 'Escolha o método "Meta tag HTML"', 'Copie apenas o valor do atributo content="..."', "Cole no campo acima"],
    },
    {
      key: "seo_google_maps_embed",
      label: "Google Maps (URL de Incorporação)",
      icon: MapPin,
      placeholder: "https://www.google.com/maps/embed?pb=!1m18!1m12...",
      type: "text",
      help: "URL de incorporação do Google Maps para exibir a localização do seu negócio.",
      link: { url: "https://www.google.com/maps", text: "Abrir Google Maps" },
      steps: ["Pesquise seu endereço no Google Maps", 'Clique em "Compartilhar" → "Incorporar um mapa"', 'Copie o valor do atributo src="..." do iframe', "Cole no campo acima"],
    },
    {
      key: "seo_google_tag_manager",
      label: "Google Tag Manager (ID do Contêiner)",
      icon: Globe,
      placeholder: "GTM-XXXXXXX",
      type: "text",
      help: 'Gerencia todas as tags de marketing sem alterar o código. Insira o ID (começa com "GTM-").',
      link: { url: "https://tagmanager.google.com/", text: "Abrir Google Tag Manager" },
      steps: ["Acesse tagmanager.google.com e crie uma conta/contêiner", "Copie o ID do contêiner (ex: GTM-XXXXXXX)", "Cole no campo acima"],
    },
    {
      key: "seo_facebook_pixel",
      label: "Facebook Pixel (ID)",
      icon: Globe,
      placeholder: "123456789012345",
      type: "text",
      help: "Rastreia conversões e permite criar públicos personalizados nas plataformas Meta.",
      link: { url: "https://business.facebook.com/events_manager", text: "Abrir Gerenciador de Eventos" },
      steps: ["Acesse business.facebook.com → Gerenciador de Eventos", "Crie ou selecione um Pixel existente", "Copie o ID do Pixel", "Cole no campo acima"],
    },
    {
      key: "seo_canonical_url",
      label: "URL Canônica (Domínio Principal)",
      icon: Globe,
      placeholder: "https://www.rosadelis.com.br",
      type: "text",
      help: "Domínio principal do site. Evita conteúdo duplicado e indica ao Google a versão oficial.",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="font-body text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">O que é SEO?</p>
          <p>SEO (Search Engine Optimization) é o conjunto de técnicas para melhorar a posição do seu site nos resultados do Google. Preencha os campos abaixo para conectar seu site às ferramentas do Google e aumentar sua visibilidade online.</p>
        </div>
      </div>

      <div className="space-y-6">
        {fields.map((field) => {
          const changed = isChanged(field.key);
          const isSaving = savingKey === field.key;

          return (
            <div key={field.key} className="space-y-2 rounded-xl border border-border p-4">
              <Label className="flex items-center gap-2 font-body text-sm font-semibold">
                <field.icon className="w-4 h-4 text-primary" />
                {field.label}
              </Label>

              <p className="font-body text-xs text-muted-foreground">{field.help}</p>

              {(field as any).steps && (
                <div className="font-body text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-foreground text-xs mb-1.5">Como configurar:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {(field as any).steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {(field as any).link && (
                <a href={(field as any).link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-body text-xs text-primary hover:underline">
                  <Globe className="w-3 h-3" />
                  {(field as any).link.text}
                </a>
              )}

              {field.type === "upload" ? (
                <div className="space-y-3">
                  {ogPreview && (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                      <img src={ogPreview} alt="OG Image preview" className="w-full h-auto max-h-48 object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 w-8 h-8" onClick={handleRemoveOg}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOgUpload} />
                    <Button type="button" variant="outline" className="gap-2 font-body" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="w-4 h-4" />
                      {uploading ? "Enviando..." : ogPreview ? "Trocar Imagem" : "Enviar Imagem"}
                    </Button>
                  </div>
                  <p className="font-body text-[11px] text-muted-foreground">Formatos aceitos: JPG, PNG, WebP. Tamanho ideal: 1200×630px.</p>
                </div>
              ) : field.type === "textarea" ? (
                <Textarea
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="font-body text-sm"
                  rows={3}
                />
              ) : (
                <Input
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="font-body text-sm"
                />
              )}

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={() => handleSaveField(field.key)}
                  disabled={isSaving || (!changed && field.type !== "upload")}
                  className="gap-1.5 font-body text-xs"
                  variant={changed ? "default" : "outline"}
                >
                  {isSaving ? (
                    <><div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full" /> Salvando...</>
                  ) : !changed && field.type !== "upload" ? (
                    <><Check className="w-3 h-3" /> Salvo</>
                  ) : (
                    <><Save className="w-3 h-3" /> Salvar</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSEO;
