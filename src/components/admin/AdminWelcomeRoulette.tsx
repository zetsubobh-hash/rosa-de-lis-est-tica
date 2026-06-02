import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Gift, Ticket, CheckCircle2, XCircle, Eye, Trash2, Plus, Save, Percent } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_ITEMS, RouletteItem, computeChances, parseItems } from "@/lib/welcomeRouletteItems";

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

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];

const AdminWelcomeRoulette = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<WelcomeCoupon[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [items, setItems] = useState<RouletteItem[]>(DEFAULT_ITEMS);
  const [savingItems, setSavingItems] = useState(false);
  const [services, setServices] = useState<{ slug: string; title: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const [settingsRes, itemsRes, couponsRes, servicesRes] = await Promise.all([
      supabase.from("payment_settings").select("key, value").eq("key", "welcome_roulette_enabled").maybeSingle(),
      supabase.from("payment_settings").select("value").eq("key", "welcome_roulette_items").maybeSingle(),
      supabase.from("coupons").select("*").like("code", "BV-%").order("created_at", { ascending: false }).limit(100),
      supabase.from("services").select("slug, title").eq("is_active", true).order("sort_order"),
    ]);

    if (servicesRes.data) setServices(servicesRes.data as any);

    if (settingsRes.data) {
      setEnabled(settingsRes.data.value === "true");
    }

    setItems(parseItems((itemsRes.data as any)?.value));

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

  const updateExpiry = async (couponId: string, newDate: string) => {
    if (!newDate) return;
    // Set to end-of-day local time so the date is fully valid through that day
    const iso = new Date(newDate + "T23:59:59").toISOString();
    const { error } = await supabase
      .from("coupons")
      .update({ expires_at: iso })
      .eq("id", couponId);
    if (error) {
      toast.error("Erro ao atualizar validade.");
      return;
    }
    toast.success("Validade atualizada! ✨");
    loadData();
  };


  const updateItem = (id: string, patch: Partial<RouletteItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItemFromPicker = (item: Omit<RouletteItem, "id">) => {
    const newId = String(Date.now());
    setItems((prev) => [...prev, { id: newId, ...item }]);
    setShowAddModal(false);
    toast.success("Item adicionado! Não esqueça de salvar.");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const saveItems = async () => {
    setSavingItems(true);
    const { error } = await supabase
      .from("payment_settings")
      .upsert({ key: "welcome_roulette_items", value: JSON.stringify(items) }, { onConflict: "key" });
    setSavingItems(false);
    if (error) {
      toast.error("Erro ao salvar itens da roleta.");
      return;
    }
    toast.success("Itens da roleta salvos! ✨");
  };

  const itemsWithChance = useMemo(() => computeChances(items), [items]);
  const activeCount = items.filter((i) => i.enabled && i.weight > 0).length;

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
      <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold text-foreground">Roleta de Boas-Vindas</h2>
              <p className="font-body text-xs text-muted-foreground">
                Novos usuários podem girar a roleta uma vez ao se cadastrar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Switch checked={enabled} onCheckedChange={toggleEnabled} />
            <span className={`font-body text-sm font-semibold ${enabled ? "text-primary" : "text-muted-foreground"}`}>
              {enabled ? "Ativada" : "Desativada"}
            </span>
          </div>
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

      {/* Items Editor */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground">Itens da Roleta</h3>
              <p className="font-body text-xs text-muted-foreground">
                {activeCount} item(s) ativo(s) — chances normalizadas automaticamente
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
            <Button size="sm" onClick={saveItems} disabled={savingItems} className="gap-1">
              <Save className="w-4 h-4" /> {savingItems ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {itemsWithChance.map((it) => (
            <div key={it.id} className="p-3 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 sm:col-span-1 flex justify-start sm:justify-center">
                <Switch
                  checked={it.enabled}
                  onCheckedChange={(v) => updateItem(it.id, { enabled: v })}
                />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <Input
                  value={it.label}
                  onChange={(e) => updateItem(it.id, { label: e.target.value })}
                  placeholder="Texto exibido"
                  className="h-9"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <select
                  value={it.type}
                  onChange={(e) => {
                    const newType = e.target.value as "discount" | "none" | "service";
                    updateItem(it.id, { type: newType });
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="discount">Desconto %</option>
                  <option value="service">Serviço grátis</option>
                  <option value="none">Sem prêmio</option>
                </select>
              </div>
              <div className="col-span-6 sm:col-span-2">
                {it.type === "service" ? (
                  <select
                    value={it.serviceSlug || ""}
                    onChange={(e) => {
                      const slug = e.target.value;
                      const svc = services.find((s) => s.slug === slug);
                      updateItem(it.id, {
                        serviceSlug: slug || undefined,
                        serviceTitle: svc?.title,
                      });
                    }}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {services.map((s) => (
                      <option key={s.slug} value={s.slug}>{s.title}</option>
                    ))}
                  </select>
                ) : (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={it.value}
                      disabled={it.type === "none"}
                      onChange={(e) => updateItem(it.id, { value: Number(e.target.value) || 0 })}
                      placeholder="% OFF"
                      className="h-9 pr-7"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
              <div className="col-span-6 sm:col-span-2">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={it.weight}
                    onChange={(e) => updateItem(it.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="Peso"
                    className="h-9 pr-14"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary">
                    {it.chance.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="col-span-4 sm:col-span-1">
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={it.expiresDays}
                    disabled={it.type === "none"}
                    onChange={(e) => updateItem(it.id, { expiresDays: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="dias"
                    title="Validade do cupom em dias"
                    className="h-9 pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">dias</span>
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <button
                  onClick={() => removeItem(it.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                  title="Remover item"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-6 text-center font-body text-sm text-muted-foreground">
              Nenhum item — adicione ao menos um para a roleta funcionar.
            </div>
          )}
        </div>

        <div className="p-3 bg-muted/30 border-t border-border">
          <p className="font-body text-[11px] text-muted-foreground leading-relaxed">
            💡 <strong>Como funciona:</strong> o "Peso" define a chance relativa de cada item. A % real é calculada dividindo o peso pelo total de pesos ativos. Ex.: 2 itens com peso 10 e 30 = 25% e 75%.
          </p>
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
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                        <td className="p-3">
                          <input
                            type="date"
                            value={coupon.expires_at.slice(0, 10)}
                            onChange={(e) => updateExpiry(coupon.id, e.target.value)}
                            className="h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                            title="Editar validade"
                          />
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {prizeCoupons.map((coupon) => {
                const expired = new Date(coupon.expires_at) < new Date();
                return (
                  <div key={coupon.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-sm font-semibold text-foreground truncate">{coupon.user_name}</p>
                      {coupon.is_used ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Usado
                        </span>
                      ) : expired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase flex-shrink-0">
                          <XCircle className="w-3 h-3" /> Expirado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold uppercase flex-shrink-0">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-muted-foreground truncate">{coupon.code}</p>
                        <p className="font-body text-xs text-muted-foreground">
                          {coupon.discount_value}% OFF
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <label className="font-body text-[10px] text-muted-foreground">Validade:</label>
                          <input
                            type="date"
                            value={coupon.expires_at.slice(0, 10)}
                            onChange={(e) => updateExpiry(coupon.id, e.target.value)}
                            className="h-7 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!coupon.is_used && !expired && (
                          <button
                            onClick={() => markUsed(coupon.id)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteCoupon(coupon.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
