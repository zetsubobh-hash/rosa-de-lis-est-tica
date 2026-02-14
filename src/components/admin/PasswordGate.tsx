import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface PasswordGateProps {
  children: React.ReactNode;
  onUnlock: () => void;
  unlocked: boolean;
  description?: string;
}

const PasswordGate = ({ children, onUnlock, unlocked, description = "Digite sua senha para acessar esta área protegida." }: PasswordGateProps) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleUnlock = async () => {
    if (!password.trim() || !user?.email) return;
    setChecking(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) {
        toast({ title: "Senha incorreta", description: "Tente novamente.", variant: "destructive" });
      } else {
        onUnlock();
      }
    } catch {
      toast({ title: "Erro ao verificar", variant: "destructive" });
    } finally {
      setPassword("");
      setChecking(false);
    }
  };

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred content behind */}
      <div className="blur-md pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="font-heading text-lg font-bold text-foreground">Área Protegida</h2>
          <p className="font-body text-sm text-muted-foreground">
            {description}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlock();
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={checking || !password.trim()}>
              {checking ? "Verificando..." : "Desbloquear"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordGate;
