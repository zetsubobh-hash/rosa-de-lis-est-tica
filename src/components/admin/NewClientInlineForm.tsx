import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Camera, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseUrl";
import { toast } from "sonner";
import Cropper, { Area } from "react-easy-crop";

interface NewClientResult {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
}

interface NewClientInlineFormProps {
  onClientCreated: (client: NewClientResult) => void;
  onCancel: () => void;
}

const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const capitalize = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

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
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
  });
}

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  sex: string;
  address: string;
  birth_date: string;
}

const emptyForm: FormData = { full_name: "", phone: "", email: "", sex: "", address: "", birth_date: "" };

const generateUsername = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(".")
    + "." + Math.floor(Math.random() * 900 + 100);
};

const generatePassword = (): string => {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 6; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
};

const sendWhatsAppCredentials = async (phone: string, fullName: string, username: string, password: string) => {
  try {
    // Fetch Evolution config from payment_settings
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", ["evolution_enabled", "evolution_api_url", "evolution_api_key", "evolution_instance_name"]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.evolution_enabled !== "true") return;

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) return;

    // Fetch business name
    const { data: siteData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteData?.value || "Rosa de Lis Estética";

    const cleanPhone = phone.replace(/\D/g, "");
    const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    const text = `Olá *${fullName}*! 👋\n\nSeu cadastro na *${businessName}* foi criado com sucesso! ✨\n\nAcesse nosso app com os dados abaixo:\n\n👤 *Usuário:* ${username}\n🔑 *Senha:* ${password}\n\nRecomendamos alterar sua senha no primeiro acesso. 💕`;

    await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text }),
    });
  } catch (e) {
    console.error("Failed to send WhatsApp credentials:", e);
  }
};

const NewClientInlineForm = ({ onClientCreated, onCancel }: NewClientInlineFormProps) => {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [creating, setCreating] = useState(false);

  // Avatar
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const onAvatarCropComplete = useCallback(async (_: Area, croppedPixels: Area) => {
    if (avatarSrc) {
      try {
        const blob = await getCroppedImg(avatarSrc, croppedPixels);
        setAvatarBlob(blob);
      } catch { /* ignore */ }
    }
  }, [avatarSrc]);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleCreate = async () => {
    const { full_name, phone, sex, address, email, birth_date } = form;
    if (!full_name || !phone || !sex || !address || !birth_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const username = generateUsername(full_name);
    const password = generatePassword();

    setCreating(true);
    try {
      const rawPhone = phone.replace(/\D/g, "");
      const res = await supabase.functions.invoke("register", {
        body: { username, password, full_name: full_name.trim(), sex, phone: rawPhone, address: address.trim(), email: email.trim() || undefined, birth_date },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || "Erro ao criar cliente");

      const newUserId = res.data.user_id;

      let avatarUrl: string | null = null;
      if (avatarBlob && newUserId) {
        const filePath = `${newUserId}/avatar.jpg`;
        await supabase.storage.from("avatars").remove([filePath]);
        const { error: upErr } = await supabase.storage.from("avatars").upload(filePath, avatarBlob, { upsert: true, contentType: "image/jpeg" });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          avatarUrl = urlData.publicUrl + "?t=" + Date.now();
          await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", newUserId);
        }
      }

      // Send credentials via WhatsApp
      sendWhatsAppCredentials(rawPhone, full_name.trim(), username, password);

      onClientCreated({
        user_id: newUserId,
        full_name: full_name.trim(),
        phone: rawPhone,
        email: email.trim() || null,
        avatar_url: avatarUrl,
      });
      toast.success("Cliente criado! Login enviado via WhatsApp 📲");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cliente");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
      {/* Avatar */}
      <div className="flex items-center gap-3">
        <div className="relative group" style={{ width: 56, height: 56 }}>
          <div
            className="w-full h-full rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarBlob ? (
              <img src={URL.createObjectURL(avatarBlob)} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-5 h-5 text-primary/40" />
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarFile} className="hidden" />
        </div>
        <p className="font-body text-[10px] text-muted-foreground">Foto (opcional)</p>
      </div>

      {/* Avatar Crop Modal */}
      <AnimatePresence>
        {avatarSrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-heading text-base font-bold text-foreground">Ajustar Avatar</h3>
                <button onClick={() => setAvatarSrc(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative w-full aspect-square bg-black">
                <Cropper image={avatarSrc} crop={avatarCrop} zoom={avatarZoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setAvatarCrop} onZoomChange={setAvatarZoom} onCropComplete={onAvatarCropComplete} />
              </div>
              <div className="px-5 py-3">
                <label className="font-body text-xs text-muted-foreground mb-1 block">Zoom</label>
                <input type="range" min={1} max={3} step={0.05} value={avatarZoom} onChange={(e) => setAvatarZoom(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button onClick={() => { setAvatarSrc(null); setAvatarBlob(null); }} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
                <button onClick={() => setAvatarSrc(null)} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form fields */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Nome Completo *</label>
          <Input value={form.full_name} onChange={(e) => setForm(prev => ({ ...prev, full_name: capitalize(e.target.value) }))} placeholder="Maria Silva" className="font-body h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Data de Nascimento *</label>
          <Input type="date" value={form.birth_date} onChange={(e) => setForm(prev => ({ ...prev, birth_date: e.target.value }))} className="font-body h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Telefone *</label>
          <Input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))} placeholder="(31) 99999-9999" className="font-body h-8 text-xs" maxLength={15} />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Sexo *</label>
          <Select value={form.sex} onValueChange={(v) => setForm(prev => ({ ...prev, sex: v }))}>
            <SelectTrigger className="font-body h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="O">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">E-mail</label>
          <Input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@exemplo.com" className="font-body h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Endereço *</label>
          <Input value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: capitalize(e.target.value) }))} placeholder="Rua..., Nº - Bairro, Cidade" className="font-body h-8 text-xs" />
        </div>
      </div>

      <p className="font-body text-[10px] text-muted-foreground italic">
        🔑 Senha gerada automaticamente e enviada via WhatsApp
      </p>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 font-body text-xs">
          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={creating} className="flex-1 font-body text-xs">
          {creating ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Criando...</> : <><UserPlus className="w-3.5 h-3.5 mr-1" /> Criar Cliente</>}
        </Button>
      </div>
    </div>
  );
};

export default NewClientInlineForm;
