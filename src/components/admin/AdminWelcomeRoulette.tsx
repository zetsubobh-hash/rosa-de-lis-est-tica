import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Ticket, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WelcomeCoupon {
  id: string;
  code: string;
  discount_value: number;
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

const AdminWelcomeRoulette = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<WelcomeCoupon[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [settingsRes, couponsRes] = await Promise.all([
      supabase.from("payment_settings").select("key, value").eq("key", "welcome_roulette_enabled").maybeSingle(),
      supabase.from("coupons").select("*").like("code", "BV-%").order("created_at", { ascending: false }).limit(100),
    ]);

    if (settingsRes.data) {
      setEnabled(settingsRes.data.value === "true");
    }

    if (couponsRes.data) {
      // Fetch user names
      const userIds = [...new Set(couponsRes.data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

      setCoupons(couponsRes.data.map((c: any) => ({
        ...c,
        user_name: nameMap[c.user_id] || "Desconhecido",
      })));
    }

    setLoading(false);
  };

  const toggleEnabled = async () => {
    const newVal = !enabled;
    const { error } = await supabase
      .from("payment_settings")
      .upsert({ key: "welcome_roulette_enabled", value: newVal ? "true" : "false" }, { onConflict: "key" });

    if (error) {
      toast.error("Erro ao salvar configuração.");
      return;
    }

    setEnabled(newVal);
    toast.success(newVal ? "Roleta de boas-vindas ativada!" : "Roleta de boas-vindas desativada.");
  };

  const markUsed = async (couponId: string) => {
    const { error } = await supabase
      .from("coupons")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", couponId);

    if (error) {
      toast.error("Erro ao atualizar cupom.");
      return;
    }

    toast.success("Cupom marcado como usado.");
    loadData();
  };

  const deleteCoupon = async (couponId: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);
    if (error) {
      toast.error("Erro ao excluir cupom.");
      return;
    }
    toast.success("Cupom excluído.");
    loadData();
  };

  // Separate prize coupons from "no win" markers
  const prizeCoupons = coupons.filter(c => !c.code.startsWith("BV-NADA"));
  const noWinEntries = coupons.filter(c => c.code.startsWith("BV-NADA"));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Roleta de Boas-Vindas</h2>
              <p className="font-body text-xs text-muted-foreground">
                Novos usuários podem girar a roleta uma vez ao se cadastrar. Chance de ganhar desconto ou não ganhar nada.
              </p>
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          >
            {enabled ? (
              <ToggleRight className="w-8 h-8 text-primary" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            )}
            <span className={`font-body text-sm font-semibold ${enabled ? "text-primary" : "text-muted-foreground"}`}>
              {enabled ? "Ativada" : "Desativada"}
            </span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-all font-body text-xs font-semibold text-foreground"
          >
            <Eye className="w-4 h-4" />
            Pré-visualizar Roleta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="font-heading text-2xl font-bold text-foreground">{coupons.length}</p>
          <p className="font-body text-xs text-muted-foreground">Total de giros</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="font-heading text-2xl font-bold text-primary">{prizeCoupons.length}</p>
          <p className="font-body text-xs text-muted-foreground">Prêmios ganhos</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="font-heading text-2xl font-bold text-muted-foreground">{noWinEntries.length}</p>
          <p className="font-body text-xs text-muted-foreground">Não ganharam</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="font-heading text-2xl font-bold text-foreground">
            {prizeCoupons.filter(c => c.is_used).length}
          </p>
          <p className="font-body text-xs text-muted-foreground">Cupons usados</p>
        </div>
      </div>

      {/* Prize Coupons Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Cupons de Boas-Vindas (prêmios)</h3>
        </div>

        {prizeCoupons.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-body text-sm text-muted-foreground">Nenhum cupom de boas-vindas gerado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</th>
                  <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validade</th>
                  <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {prizeCoupons.map((coupon) => {
                  const expired = new Date(coupon.expires_at) < new Date();
                  return (
                    <tr key={coupon.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-body text-sm text-foreground">{coupon.user_name}</td>
                      <td className="p-3 font-mono text-sm text-foreground">{coupon.code}</td>
                      <td className="p-3 font-body text-sm font-bold text-primary">{coupon.discount_value}%</td>
                      <td className="p-3 font-body text-xs text-muted-foreground">
                        {new Date(coupon.expires_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3">
                        {coupon.is_used ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Usado
                          </span>
                        ) : expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase">
                            <XCircle className="w-3 h-3" /> Expirado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold uppercase">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!coupon.is_used && !expired && (
                            <button
                              onClick={() => markUsed(coupon.id)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                              title="Marcar como usado"
                            >
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteCoupon(coupon.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {showPreview && (
        <WelcomeRoulettePreview onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};

import WelcomeRouletteComponent from "@/components/WelcomeRoulette";

const WelcomeRoulettePreview = ({ onClose }: { onClose: () => void }) => {
  return <WelcomeRouletteComponent testMode onClose={onClose} />;
};

export default AdminWelcomeRoulette;
