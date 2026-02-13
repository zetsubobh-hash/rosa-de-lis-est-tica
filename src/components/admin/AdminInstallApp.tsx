import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle2, Camera, X, Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    512,
    512
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

const AdminInstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Icon upload
  const [iconUrl, setIconUrl] = useState<string>("/pwa-512x512.png");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // QR Code URL
  const defaultInstallUrl = window.location.origin + "/instalar";
  const [appUrl, setAppUrl] = useState(defaultInstallUrl);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(defaultInstallUrl);
  const [qrKey, setQrKey] = useState(Date.now());
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    // Load saved icon
    const { data } = supabase.storage.from("branding").getPublicUrl("pwa-icon.png");
    if (data?.publicUrl) {
      const img = new Image();
      img.onload = () => setIconUrl(data.publicUrl + "?t=" + Date.now());
      img.onerror = () => {};
      img.src = data.publicUrl;
    }

    // Load saved app URL
    supabase
      .from("payment_settings")
      .select("value")
      .eq("key", "app_install_url")
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.value) {
          setAppUrl(row.value);
          setUrlDraft(row.value);
        }
      });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
    } else if (isIOS) {
      toast.info("No iPhone/iPad, toque no ícone de compartilhar do Safari e depois em \"Adicionar à Tela de Início\".");
    } else {
      toast.info("Abra este site diretamente no navegador Chrome do seu celular para instalar o app.");
    }
  };

  const handleSaveUrl = async () => {
    const url = urlDraft.trim();
    if (!url) return;
    setSavingUrl(true);
    try {
      const { data: existing } = await supabase
        .from("payment_settings")
        .select("id")
        .eq("key", "app_install_url")
        .maybeSingle();

      if (existing) {
        await supabase.from("payment_settings").update({ value: url }).eq("key", "app_install_url");
      } else {
        await supabase.from("payment_settings").insert({ key: "app_install_url", value: url });
      }

      setAppUrl(url);
      setEditingUrl(false);
      setQrKey(Date.now());
      toast.success("Endereço do app atualizado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSavingUrl(false);
    }
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filePath = "pwa-icon.png";

      await supabase.storage.from("branding").remove([filePath]);
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("branding").getPublicUrl(filePath);
      const url = data.publicUrl + "?t=" + Date.now();
      setIconUrl(url);
      setImageSrc(null);
      toast.success("Ícone do app atualizado!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center space-y-6">
          {/* Icon with upload */}
          <div className="space-y-3">
            <div
              className="relative group w-28 h-28 mx-auto cursor-pointer"
              onClick={() => inputRef.current?.click()}
            >
              <div className="w-full h-full rounded-[24px] bg-white shadow-lg border border-border overflow-hidden">
                {isInstalled ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </div>
                ) : (
                  <img src={iconUrl} alt="Ícone do App" className="w-full h-full object-contain p-2" />
                )}
              </div>
              {!isInstalled && (
                <div className="absolute inset-0 rounded-[24px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            {!isInstalled && (
              <p className="font-body text-xs text-muted-foreground">
                Clique no ícone para alterar a imagem do app
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Title */}
          <div className="space-y-2">
            <h3 className="font-heading text-xl font-bold text-foreground">
              {isInstalled ? "App instalado! ✅" : "Instalar o App"}
            </h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              {isInstalled
                ? "O Rosa de Lis já está instalado no seu dispositivo. Acesse diretamente pela tela inicial."
                : "Instale o Rosa de Lis no seu celular para acessar rapidamente sem precisar abrir o navegador."}
            </p>
          </div>

          {/* Action */}
          {isInstalled ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="font-body text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Procure o ícone "Rosa de Lis" na tela inicial do seu celular
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Direct install button — always visible */}
              <Button
                onClick={handleInstall}
                disabled={installing}
                size="lg"
                className="w-full gap-2 text-base"
              >
                <Download className="w-5 h-5" />
                {installing ? "Instalando..." : "Instalar agora"}
              </Button>

              {!deferredPrompt && (
                <p className="font-body text-xs text-muted-foreground">
                  {isIOS
                    ? "No iOS, use o botão de compartilhar do Safari e toque em \"Adicionar à Tela de Início\"."
                    : "Se o botão acima não funcionar, toque no menu ⋮ do navegador e selecione \"Instalar app\"."}
                </p>
              )}
            </div>
          )}

          {/* QR Code for clients */}
          <div className="pt-4 border-t border-border space-y-4">
            <p className="font-body text-sm font-semibold text-foreground">
              Mostre para seus clientes
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Peça para escanear o QR Code abaixo com a câmera do celular para instalar o app
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-border inline-block">
                <img
                  key={qrKey}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&margin=8`}
                  alt="QR Code para instalar o app"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Editable URL */}
            <div className="space-y-2">
              <label className="font-body text-xs text-muted-foreground block">
                Endereço do app (usado no QR Code)
              </label>
              {editingUrl ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="https://seusite.com.br"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveUrl}
                    disabled={savingUrl || !urlDraft.trim()}
                    className="gap-1.5"
                  >
                    {savingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingUrl(false); setUrlDraft(appUrl); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-body text-sm font-semibold text-primary break-all select-all flex-1">
                    {appUrl}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingUrl(true); setUrlDraft(appUrl); }}
                    className="gap-1.5 shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Alterar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {imageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-heading text-base font-bold text-foreground">Ajustar Ícone do App</h3>
                <button onClick={() => setImageSrc(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full aspect-square bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="px-5 py-3">
                <label className="font-body text-xs text-muted-foreground mb-1 block">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => setImageSrc(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminInstallApp;
