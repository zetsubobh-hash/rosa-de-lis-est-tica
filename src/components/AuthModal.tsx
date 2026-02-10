import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSex, setRegSex] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");

  const resetFields = () => {
    setEmail("");
    setPassword("");
    setRegName("");
    setRegEmail("");
    setRegPassword("");
    setRegSex("");
    setRegPhone("");
    setRegAddress("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Login realizado com sucesso!" });
      resetFields();
      onOpenChange(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regSex || !regPhone.trim() || !regAddress.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim(),
      password: regPassword,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: regName.trim() },
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
      return;
    }

    // Insert profile
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: regName.trim(),
        sex: regSex,
        phone: regPhone.trim(),
        address: regAddress.trim(),
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }
    }

    setLoading(false);
    toast({ title: "Cadastro realizado!", description: "Verifique seu e-mail para confirmar a conta." });
    resetFields();
    setMode("login");
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
            <div className="space-y-2">
              <Label htmlFor="login-email" className="font-body text-sm">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="font-body text-sm">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
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
            <div className="space-y-2">
              <Label htmlFor="reg-name" className="font-body text-sm">Nome completo</Label>
              <Input
                id="reg-name"
                placeholder="Maria Silva"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-sex" className="font-body text-sm">Sexo</Label>
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
              <Label htmlFor="reg-email" className="font-body text-sm">E-mail</Label>
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
              <Label htmlFor="reg-password" className="font-body text-sm">Senha</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone" className="font-body text-sm">Telefone</Label>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-address" className="font-body text-sm">Endereço completo</Label>
              <Input
                id="reg-address"
                placeholder="Rua, número, bairro, cidade"
                value={regAddress}
                onChange={(e) => setRegAddress(e.target.value)}
                autoComplete="street-address"
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
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
