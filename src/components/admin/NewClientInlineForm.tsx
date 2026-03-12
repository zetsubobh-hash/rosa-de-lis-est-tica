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
  username: string;
  password: string;
  phone: string;
  email: string;
  sex: string;
  address: string;
}

const emptyForm: FormData = { full_name: "", username: "", password: "", phone: "", email: "", sex: "", address: "" };

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
    const { full_name, username, password, phone, sex, address, email } = form;
    if (!full_name || !username || !password || !phone || !sex || !address) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    setCreating(true);
    try {
      const rawPhone = phone.replace(/\D/g, "");
      const res = await supabase.functions.invoke("register", {
        body: { username: username.toLowerCase(), password, full_name: full_name.trim(), sex, phone: rawPhone, address: address.trim(), email: email.trim() || undefined },
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

      onClientCreated({
        user_id: newUserId,
        full_name: full_name.trim(),
        phone: rawPhone,
        email: email.trim() || null,
        avatar_url: avatarUrl,
      });
      toast.success("Cliente criado com sucesso!");
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
          <label className="font-body text-[10px] font-medium text-foreground">Usuário (login) *</label>
          <Input value={form.username} onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))} placeholder="maria.silva" className="font-body h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Senha *</label>
          <Input type="password" value={form.password} onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Mín. 6 caracteres" className="font-body h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Telefone *</label>
          <Input value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: formatPhone(e.target.value) }))} placeholder="(31) 99999-9999" className="font-body h-8 text-xs" maxLength={15} />
        </div>
        <div className="space-y-1">
          <label className="font-body text-[10px] font-medium text-foreground">Sexo *</label>
          <Select value={form.sex} onValueChange={(v) => setForm(prev => ({ ...prev, sex: v }))}>
            <SelectTrigger className="font-body h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
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
        <div className="space-y-1 sm:col-span-2">
          <label className="font-body text-[10px] font-medium text-foreground">Endereço *</label>
          <Input value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: capitalize(e.target.value) }))} placeholder="Rua..., Nº - Bairro, Cidade" className="font-body h-8 text-xs" />
        </div>
      </div>

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
