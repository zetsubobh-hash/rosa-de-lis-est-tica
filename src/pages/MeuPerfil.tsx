import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Lock, User as UserIcon, Phone, MapPin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import AvatarUpload from "@/components/AvatarUpload";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ProfileData {
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  sex: string;
  avatar_url: string | null;
}

const MeuPerfil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, email, address, sex, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile(data);
      setLoading(false);
    };
    fetch();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!profile || !user) return;
    if (!profile.full_name.trim()) {
      toast.error("O nome não pode estar vazio.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        phone: profile.phone,
        address: profile.address,
        sex: profile.sex,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Perfil atualizado com sucesso!");
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-lg mx-auto px-6 py-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-4">
              <AvatarUpload
                avatarUrl={profile.avatar_url}
                onAvatarChange={(url) => setProfile({ ...profile, avatar_url: url })}
                size={96}
              />
            </div>
            <h1 className="font-heading text-2xl font-bold text-primary-foreground">{profile.full_name}</h1>
            <p className="font-body text-sm text-primary-foreground/60 mt-1">{user?.email || profile.email}</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* Profile Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <UserIcon className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">Dados Pessoais</h2>
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Nome Completo</label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="font-body"
            />
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="font-body pl-10"
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="font-body pl-10"
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Sexo</label>
            <select
              value={profile.sex}
              onChange={(e) => setProfile({ ...profile, sex: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={user?.email || profile.email || ""}
                disabled
                className="font-body pl-10 bg-muted"
              />
            </div>
            <p className="font-body text-[11px] text-muted-foreground mt-1">O e-mail não pode ser alterado.</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </motion.div>

        {/* Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-base font-bold text-foreground">Alterar Senha</h2>
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Nova Senha</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="font-body"
            />
          </div>

          <div>
            <label className="font-body text-xs font-medium text-muted-foreground mb-1 block">Confirmar Nova Senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="font-body"
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !newPassword}
            className="w-full py-2.5 rounded-xl border border-border text-foreground font-body text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {changingPassword ? "Alterando..." : "Alterar Senha"}
          </button>
        </motion.div>

        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </button>
      </div>

      <Footer />
    </div>
  );
};

export default MeuPerfil;
