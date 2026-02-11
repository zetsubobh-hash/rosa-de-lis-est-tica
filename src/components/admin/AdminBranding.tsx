import { useState, useRef } from "react";
import { Upload, Image, Globe, Loader2, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "branding";

interface BrandingItemProps {
  label: string;
  description: string;
  icon: typeof Image;
  fileName: string;
  accept: string;
}

const BrandingItem = ({ label, description, icon: Icon, fileName, accept }: BrandingItemProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing file on mount
  useState(() => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    // Check if file exists by trying to fetch it
    fetch(data.publicUrl, { method: "HEAD" }).then((res) => {
      if (res.ok) {
        setPreviewUrl(data.publicUrl + "?t=" + Date.now());
        setLoaded(true);
      } else {
        setLoaded(true);
      }
    }).catch(() => setLoaded(true));
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      // Remove existing file first
      await supabase.storage.from(BUCKET).remove([fileName]);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, { upsert: true, cacheControl: "60" });

      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      setPreviewUrl(data.publicUrl + "?t=" + Date.now());
      toast.success(`${label} atualizado com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao fazer upload: " + err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
      if (error) throw error;
      setPreviewUrl(null);
      toast.success(`${label} removido.`);
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-semibold text-foreground">{label}</h3>
          <p className="font-body text-sm text-muted-foreground mt-1">{description}</p>

          {/* Preview */}
          {loaded && previewUrl && (
            <div className="mt-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                <img
                  src={previewUrl}
                  alt={label}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remover
              </button>
            </div>
          )}

          {/* Upload button */}
          <div className="mt-4">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleUpload}
              className="hidden"
              id={`upload-${fileName}`}
            />
            <label
              htmlFor={`upload-${fileName}`}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                uploading
                  ? "bg-muted text-muted-foreground cursor-wait"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : previewUrl ? (
                <Check className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Enviando..." : previewUrl ? "Substituir" : "Fazer Upload"}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminBranding = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">Identidade Visual</h2>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Atualize a logomarca e o favicon do seu site.
        </p>
      </div>

      <div className="grid gap-4">
        <BrandingItem
          label="Logomarca"
          description="Imagem exibida no cabeçalho do site. Recomendado: PNG transparente, máx. 2MB."
          icon={Image}
          fileName="logo.png"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
        />
        <BrandingItem
          label="Favicon"
          description="Ícone exibido na aba do navegador. Recomendado: PNG ou ICO, 32x32px ou 64x64px."
          icon={Globe}
          fileName="favicon.png"
          accept="image/png,image/x-icon,image/ico,image/svg+xml"
        />
      </div>
    </div>
  );
};

export default AdminBranding;
