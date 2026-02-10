import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2, Search } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
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

  const resetFields = () => {
    setEmail("");
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
    const fullAddress = buildFullAddress();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regSex || !regPhone.trim() || !fullAddress.trim()) {
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

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: regName.trim(),
        sex: regSex,
        phone: regPhone.trim(),
        address: fullAddress.trim(),
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
                placeholder="(31) 99999-9999"
                value={regPhone}
                onChange={(e) => setRegPhone(formatPhone(e.target.value))}
                autoComplete="tel"
              />
            </div>

            {/* CEP + Address */}
            <div className="space-y-2">
              <Label htmlFor="reg-cep" className="font-body text-sm">CEP</Label>
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
                <Label htmlFor="reg-rua" className="font-body text-sm">Rua</Label>
                <Input
                  id="reg-rua"
                  placeholder="Rua / Avenida"
                  value={regRua}
                  onChange={(e) => setRegRua(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-numero" className="font-body text-sm">Nº</Label>
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
                <Label htmlFor="reg-bairro" className="font-body text-sm">Bairro</Label>
                <Input
                  id="reg-bairro"
                  placeholder="Bairro"
                  value={regBairro}
                  onChange={(e) => setRegBairro(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-cidade" className="font-body text-sm">Cidade</Label>
                <Input
                  id="reg-cidade"
                  placeholder="Cidade"
                  value={regCidade}
                  onChange={(e) => setRegCidade(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-estado" className="font-body text-sm">Estado (UF)</Label>
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
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
