import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, DollarSign, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllServicePrices, formatCents, type ServicePrice } from "@/hooks/useServicePrices";
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { getIconByName } from "@/lib/iconMap";

const AdminPricing = () => {
  const { toast } = useToast();
  const { prices, loading, refetch } = useAllServicePrices();
  const { services: dbServices, loading: servicesLoading } = useServices();
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ServicePrice>>>({});
  const [saving, setSaving] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  // New plan form state
  const [newPlan, setNewPlan] = useState<{
    service_slug: string;
    plan_name: string;
    sessions: string;
    price_per_session: string;
    total_price: string;
  } | null>(null);
  const [addingPlan, setAddingPlan] = useState(false);

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

  const handleAddPlan = async () => {
    if (!newPlan || !newPlan.plan_name.trim() || !newPlan.service_slug) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setAddingPlan(true);
    const sessions = parseInt(newPlan.sessions) || 1;
    const pricePerSession = Math.round(parseFloat(newPlan.price_per_session.replace(",", ".")) * 100) || 0;
    const totalPrice = Math.round(parseFloat(newPlan.total_price.replace(",", ".")) * 100) || pricePerSession * sessions;

    const { error } = await supabase.from("service_prices").insert({
      service_slug: newPlan.service_slug,
      plan_name: newPlan.plan_name.trim(),
      sessions,
      price_per_session_cents: pricePerSession,
      total_price_cents: totalPrice,
    });

    if (error) {
      toast({ title: "Erro ao adicionar plano", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano adicionado! ✅" });
      setNewPlan(null);
      await refetch();
    }
    setAddingPlan(false);
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${planName}"?`)) return;

    const { error } = await supabase.from("service_prices").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Plano excluído! 🗑️" });
      await refetch();
    }
  };

  if (loading || servicesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const groupedByService = dbServices.map((svc) => ({
    ...svc,
    plans: prices.filter((p) => p.service_slug === svc.slug),
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Preços dos Planos ({prices.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setNewPlan(
                newPlan
                  ? null
                  : { service_slug: dbServices[0]?.slug || "", plan_name: "", sessions: "1", price_per_session: "", total_price: "" }
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground font-body text-sm font-semibold hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving || Object.keys(editedPrices).length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {/* New plan form */}
      {newPlan && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 border-primary/30 p-5 mb-6 space-y-4"
        >
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Adicionar Novo Plano
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-body text-[11px] text-muted-foreground mb-1 block">Serviço</label>
              <select
                value={newPlan.service_slug}
                onChange={(e) => setNewPlan({ ...newPlan, service_slug: e.target.value })}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 font-body text-sm text-foreground"
              >
                {dbServices.map((svc) => (
                  <option key={svc.slug} value={svc.slug}>
                    {svc.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground mb-1 block">Nome do Plano</label>
              <Input
                type="text"
                placeholder="Ex: Essencial, Premium, VIP"
                value={newPlan.plan_name}
                onChange={(e) => setNewPlan({ ...newPlan, plan_name: e.target.value })}
                className="font-body text-sm h-9"
              />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground mb-1 block">Sessões</label>
              <Input
                type="number"
                min={1}
                value={newPlan.sessions}
                onChange={(e) => setNewPlan({ ...newPlan, sessions: e.target.value })}
                className="font-body text-sm h-9"
              />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground mb-1 block">Preço/sessão (R$)</label>
              <Input
                type="text"
                placeholder="0,00"
                value={newPlan.price_per_session}
                onChange={(e) => setNewPlan({ ...newPlan, price_per_session: e.target.value })}
                className="font-body text-sm h-9"
              />
            </div>
            <div>
              <label className="font-body text-[11px] text-muted-foreground mb-1 block">Total (R$)</label>
              <Input
                type="text"
                placeholder="0,00"
                value={newPlan.total_price}
                onChange={(e) => setNewPlan({ ...newPlan, total_price: e.target.value })}
                className="font-body text-sm h-9"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddPlan}
              disabled={addingPlan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {addingPlan ? "Adicionando..." : "Adicionar Plano"}
            </button>
            <button
              onClick={() => setNewPlan(null)}
              className="px-4 py-2 rounded-xl border border-border text-muted-foreground font-body text-sm font-semibold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {groupedByService.map((svc) => {
          const isExpanded = expandedSlug === svc.slug;
          const Icon = getIconByName(svc.icon_name);
          return (
            <div key={svc.slug} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedSlug(isExpanded ? null : svc.slug)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {Icon && <Icon className="w-4 h-4 text-primary" />}
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
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <span className="font-heading text-sm font-bold text-foreground">{plan.plan_name}</span>
                              </div>
                              <button
                                onClick={() => handleDeletePlan(plan.id, plan.plan_name)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Excluir plano"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
