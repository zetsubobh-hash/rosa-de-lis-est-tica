import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/lib/supabaseUrl";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2, Eye, EyeOff, Camera, X, Check } from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import { AnimatePresence, motion } from "framer-motion";

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

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCep = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const capitalizeWords = (value: string) => {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
};

const AuthModal = ({ open, onOpenChange, onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);

  // Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSex, setRegSex] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCep, setRegCep] = useState("");
  const [regRua, setRegRua] = useState("");
  const [regNumero, setRegNumero] = useState("");
  const [regBairro, setRegBairro] = useState("");
  const [regCidade, setRegCidade] = useState("");
  const [regEstado, setRegEstado] = useState("");

  // Avatar during registration
  const [regAvatarPreview, setRegAvatarPreview] = useState<string | null>(null);
  const [regAvatarBlob, setRegAvatarBlob] = useState<Blob | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande. Máximo 5MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
    setRegAvatarBlob(blob);
    setRegAvatarPreview(URL.createObjectURL(blob));
    setCropImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const uploadAvatarAfterRegister = async (userId: string) => {
    if (!regAvatarBlob) return;
    try {
      const filePath = `${userId}/avatar.jpg`;
      await supabase.storage.from("avatars").remove([filePath]);
      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, regAvatarBlob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = data.publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", userId);
    } catch (err: any) {
      console.error("Avatar upload error:", err.message);
    }
  };

  const resetFields = () => {
    setLoginUsername("");
    setPassword("");
    setRegName("");
    
    setRegEmail("");
    setRegPassword("");
    setRegSex("");
    setRegPhone("");
    setRegCep("");
    setRegRua("");
    setRegNumero("");
    setRegBairro("");
    setRegCidade("");
    setRegEstado("");
    setRegAvatarPreview(null);
    setRegAvatarBlob(null);
    setCropImageSrc(null);
  };

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      } else {
        setRegRua(data.logradouro || "");
        setRegBairro(data.bairro || "");
        setRegCidade(data.localidade || "");
        setRegEstado(data.uf || "");
      }
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    }
    setCepLoading(false);
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setRegCep(formatted);
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      fetchCep(digits);
    }
  };

  const buildFullAddress = () => {
    const parts = [regRua, regNumero, regBairro, regCidade, regEstado].filter(Boolean);
    return parts.join(", ");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setLoginError(true);
        setLoading(false);
        return;
      }

      setLoginError(false);

      // Set the session using the tokens from the edge function
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        toast({ title: "Erro ao entrar", description: "Tente novamente.", variant: "destructive" });
      } else {
        toast({ title: "Login realizado com sucesso!" });
        resetFields();
        onOpenChange(false);
        onSuccess?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPassword.trim() || !regSex || !regPhone.trim() || !regCep.replace(/\D/g, "").trim() || !regRua.trim() || !regNumero.trim() || !regBairro.trim() || !regCidade.trim() || !regEstado.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios (*)", variant: "destructive" });
      return;
    }
    const fullAddress = buildFullAddress();
    if (regPassword.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);

    const generatedUsername = regName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: generatedUsername,
          password: regPassword,
          full_name: regName.trim(),
          sex: regSex,
          phone: regPhone.trim(),
          address: fullAddress.trim(),
          email: regEmail.trim() || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast({ title: "Erro no cadastro", description: result.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Auto-login after registration via edge function
      const loginRes = await fetch(`${SUPABASE_URL}/functions/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: generatedUsername,
          password: regPassword,
        }),
      });

      const loginResult = await loginRes.json();

      if (!loginRes.ok) {
        toast({ title: "Cadastro realizado!", description: "Faça login com seu nome de usuário." });
        setMode("login");
      } else {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: loginResult.access_token,
          refresh_token: loginResult.refresh_token,
        });

        if (sessionError) {
          toast({ title: "Cadastro realizado!", description: "Faça login com seu nome de usuário." });
          setMode("login");
        } else {
          toast({ title: "Cadastro realizado com sucesso!" });
          // Upload avatar if selected (after user is logged in)
          if (regAvatarBlob) {
            const userId = result.user_id;
            await uploadAvatarAfterRegister(userId);
          }
          onOpenChange(false);
          if (onSuccess) {
            onSuccess();
          } else {
            setTimeout(() => {
              document.getElementById("servicos")?.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }
        }
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }

    setLoading(false);
    resetFields();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-center">
            {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
          </DialogTitle>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4 mt-2">
            {loginError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
                <p className="font-body text-sm text-destructive font-medium">
                  Usuário ou senha incorretos
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Não possui uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setLoginError(false); }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Cadastre-se agora
                  </button>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="login-username" className="font-body text-sm">Nome completo</Label>
              <Input
                id="login-username"
                placeholder="Maria Silva"
                value={loginUsername}
                onChange={(e) => { setLoginUsername(capitalizeWords(e.target.value)); setLoginError(false); }}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="font-body text-sm">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Entrar
            </Button>
            <p className="text-center font-body text-sm text-muted-foreground">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary font-semibold hover:underline"
              >
                Cadastre-se
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 mt-2">
            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-20 h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
              >
                {regAvatarPreview ? (
                  <img src={regAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-primary/40 group-hover:text-primary/60 transition-colors" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="font-body text-xs text-muted-foreground">Foto de perfil (opcional)</span>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-name" className="font-body text-sm">Nome completo *</Label>
              <Input
                id="reg-name"
                placeholder="Maria Silva"
                value={regName}
                onChange={(e) => setRegName(capitalizeWords(e.target.value))}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-body text-sm">E-mail (opcional)</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="seu@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-sex" className="font-body text-sm">Sexo *</Label>
              <Select value={regSex} onValueChange={setRegSex}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="masculino">Masculino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="font-body text-sm">Senha *</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone" className="font-body text-sm">Telefone *</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="(31) 99999-9999"
                value={regPhone}
                onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                autoComplete="tel"
              />
            </div>

            {/* CEP + Address */}
            <div className="space-y-2">
              <Label htmlFor="reg-cep" className="font-body text-sm">CEP *</Label>
              <div className="relative">
                <Input
                  id="reg-cep"
                  placeholder="00000-000"
                  value={regCep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  autoComplete="postal-code"
                />
                {cepLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="reg-rua" className="font-body text-sm">Rua *</Label>
                <Input
                  id="reg-rua"
                  placeholder="Rua / Avenida"
                  value={regRua}
                  onChange={(e) => setRegRua(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-numero" className="font-body text-sm">Nº *</Label>
                <Input
                  id="reg-numero"
                  placeholder="123"
                  value={regNumero}
                  onChange={(e) => setRegNumero(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="reg-bairro" className="font-body text-sm">Bairro *</Label>
                <Input
                  id="reg-bairro"
                  placeholder="Bairro"
                  value={regBairro}
                  onChange={(e) => setRegBairro(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-cidade" className="font-body text-sm">Cidade *</Label>
                <Input
                  id="reg-cidade"
                  placeholder="Cidade"
                  value={regCidade}
                  onChange={(e) => setRegCidade(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-estado" className="font-body text-sm">Estado (UF) *</Label>
              <Input
                id="reg-estado"
                placeholder="MG"
                value={regEstado}
                onChange={(e) => setRegEstado(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Cadastrar
            </Button>
            <p className="text-center font-body text-sm text-muted-foreground">
              Já tem conta?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary font-semibold hover:underline"
              >
                Entrar
              </button>
            </p>
          </form>
        )}

        {/* Crop Modal */}
        <AnimatePresence>
          {cropImageSrc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="font-heading text-base font-bold text-foreground">Ajustar Foto</h3>
                  <button onClick={() => setCropImageSrc(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative w-full aspect-square bg-black">
                  <Cropper
                    image={cropImageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
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
                    type="button"
                    onClick={() => setCropImageSrc(null)}
                    className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCropSave}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
