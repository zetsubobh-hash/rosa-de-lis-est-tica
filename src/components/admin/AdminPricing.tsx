import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllServicePrices, formatCents, type ServicePrice } from "@/hooks/useServicePrices";
import { services } from "@/data/services";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const AdminPricing = () => {
  const { toast } = useToast();
  const { prices, loading, refetch } = useAllServicePrices();
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ServicePrice>>>({});
  const [saving, setSaving] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const handleChange = (id: string, field: keyof ServicePrice, value: string) => {
    const numValue = field === "sessions" ? parseInt(value) || 0 : Math.round(parseFloat(value.replace(",", ".")) * 100) || 0;
    setEditedPrices((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: numValue },
    }));
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(editedPrices);
    if (entries.length === 0) {
      toast({ title: "Nenhuma alteração para salvar." });
      return;
    }
    setSaving(true);
    let hasError = false;

    for (const [id, changes] of entries) {
      // If both per-session and total changed, use both. Otherwise recalculate.
      const original = prices.find((p) => p.id === id);
      if (!original) continue;

      const sessions = changes.sessions ?? original.sessions;
      const pricePerSession = changes.price_per_session_cents ?? original.price_per_session_cents;
      const totalPrice = changes.total_price_cents ?? pricePerSession * sessions;

      const { error } = await supabase
        .from("service_prices")
        .update({
          sessions,
          price_per_session_cents: pricePerSession,
          total_price_cents: totalPrice,
        })
        .eq("id", id);
      if (error) hasError = true;
    }

    if (hasError) {
      toast({ title: "Erro ao salvar alguns preços", variant: "destructive" });
    } else {
      toast({ title: "Preços atualizados com sucesso! ✅" });
      setEditedPrices({});
    }
    await refetch();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedByService = services.map((svc) => ({
    ...svc,
    plans: prices.filter((p) => p.service_slug === svc.slug),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Preços dos Planos ({prices.length})
        </h2>
        <button
          onClick={handleSaveAll}
          disabled={saving || Object.keys(editedPrices).length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      <div className="space-y-3">
        {groupedByService.map((svc) => {
          const isExpanded = expandedSlug === svc.slug;
          const Icon = svc.icon;
          return (
            <div key={svc.slug} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedSlug(isExpanded ? null : svc.slug)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-heading text-sm font-bold text-foreground flex-1">{svc.title}</span>
                <span className="font-body text-xs text-muted-foreground">
                  {svc.plans.length} planos
                </span>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="text-muted-foreground"
                >
                  ▾
                </motion.span>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-border"
                >
                  <div className="p-5 space-y-4">
                    {svc.plans.length === 0 ? (
                      <p className="font-body text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
                    ) : (
                      svc.plans.map((plan) => {
                        const edited = editedPrices[plan.id];
                        const currentSessions = edited?.sessions ?? plan.sessions;
                        const currentPerSession = edited?.price_per_session_cents ?? plan.price_per_session_cents;
                        const currentTotal = edited?.total_price_cents ?? plan.total_price_cents;

                        return (
                          <div key={plan.id} className="rounded-xl border border-border p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <span className="font-heading text-sm font-bold text-foreground">{plan.plan_name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Sessões</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={currentSessions}
                                  onChange={(e) => handleChange(plan.id, "sessions", e.target.value)}
                                  className="font-body text-sm h-9"
                                />
                              </div>
                              <div>
                                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Preço/sessão (R$)</label>
                                <Input
                                  type="text"
                                  value={(currentPerSession / 100).toFixed(2).replace(".", ",")}
                                  onChange={(e) => handleChange(plan.id, "price_per_session_cents", e.target.value)}
                                  className="font-body text-sm h-9"
                                />
                              </div>
                              <div>
                                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Total (R$)</label>
                                <Input
                                  type="text"
                                  value={(currentTotal / 100).toFixed(2).replace(".", ",")}
                                  onChange={(e) => handleChange(plan.id, "total_price_cents", e.target.value)}
                                  className="font-body text-sm h-9"
                                />
                              </div>
                            </div>
                            {edited && (
                              <p className="font-body text-[10px] text-primary mt-2">• Alterado (salve para aplicar)</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AdminPricing;
