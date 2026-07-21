import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Gift, Ticket, CheckCircle2, XCircle, Eye, Trash2, Plus, Save, Percent, AlertCircle, QrCode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_ITEMS, RouletteItem, computeChances, parseItems } from "@/lib/welcomeRouletteItems";
import QRCodeCardModal from "./QRCodeCardModal";
import WelcomePopupSettings from "./WelcomePopupSettings";

interface WelcomeCoupon {
  id: string;
  code: string;
  discount_type?: string;
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
  const [showQRModal, setShowQRModal] = useState(false);

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
    if (items.length >= 10) {
      toast.error("Limite de 10 itens atingido. Delete um item para adicionar outro.");
      return;
    }
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
      <WelcomePopupSettings />

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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-all font-body text-xs font-semibold text-foreground"
          >
            <Eye className="w-4 h-4" />
            Pré-visualizar Roleta
          </button>
          <button
            onClick={() => setShowQRModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all font-body text-xs font-semibold text-primary"
            title="Gerar QR Code para imprimir nos cartões de prêmio"
          >
            <QrCode className="w-4 h-4" />
            QR Code do Cartão
          </button>
        </div>
      </div>

      <QRCodeCardModal open={showQRModal} onClose={() => setShowQRModal(false)} />

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
                {items.length}/10 itens — {activeCount} ativo(s) — chances normalizadas automaticamente
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={items.length >= 10}
              className="gap-1"
              title={items.length >= 10 ? "Limite de 10 itens atingido. Delete um item para adicionar outro." : "Adicionar item"}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
            <Button size="sm" onClick={saveItems} disabled={savingItems} className="gap-1">
              <Save className="w-4 h-4" /> {savingItems ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {itemsWithChance.map((it) => (
            <div key={it.id} className="p-3 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center space-y-2 sm:space-y-0">
              {/* Mobile card header */}
              <div className="flex items-center justify-between sm:hidden">
                <span className="font-body text-xs font-semibold text-muted-foreground truncate flex-1">{it.label || "Item sem nome"}</span>
                <span className="text-[10px] font-semibold text-primary flex-shrink-0 ml-2">{it.chance.toFixed(1)}%</span>
              </div>

              <div className="sm:col-span-1 flex justify-start sm:justify-center">
                <Switch
                  checked={it.enabled}
                  onCheckedChange={(v) => updateItem(it.id, { enabled: v })}
                />
              </div>
              <div className="sm:col-span-3">
                <label className="sm:hidden font-body text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Texto</label>
                <Input
                  value={it.label}
                  onChange={(e) => updateItem(it.id, { label: e.target.value })}
                  placeholder="Texto exibido"
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:contents gap-2">
                <div className="sm:col-span-2">
                  <label className="sm:hidden font-body text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tipo</label>
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
                <div className="sm:col-span-2">
                  <label className="sm:hidden font-body text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Valor</label>
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
                <div className="sm:col-span-2">
                  <label className="sm:hidden font-body text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Peso</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={it.weight}
                      onChange={(e) => updateItem(it.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                      placeholder="Peso"
                      className="h-9"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-primary hidden sm:inline">
                      {it.chance.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <label className="sm:hidden font-body text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Validade</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={it.expiresDays}
                      disabled={it.type === "none"}
                      onChange={(e) => updateItem(it.id, { expiresDays: Math.max(1, Number(e.target.value) || 1) })}
                      placeholder="dias"
                      title="Validade do cupom em dias"
                      className="h-9 pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">d</span>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-1 flex justify-end">
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


      {/* All Spins Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Histórico de Giros (todos)</h3>
          <span className="ml-auto font-body text-[11px] text-muted-foreground">
            {prizeCoupons.length} prêmios • {noWinEntries.length} não ganharam
          </span>
        </div>

        {coupons.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-body text-sm text-muted-foreground">Nenhum giro registrado ainda.</p>
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
                    <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prêmio</th>
                    <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validade</th>
                    <th className="text-left p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right p-3 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const isNoWin = coupon.code.startsWith("BV-NADA");
                    const isService = coupon.discount_type === "service" || coupon.code.startsWith("BV-SRV");
                    const expired = new Date(coupon.expires_at) < new Date();
                    return (
                      <tr key={coupon.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${isNoWin ? "opacity-70" : ""}`}>
                        <td className="p-3 font-body text-sm text-foreground">{coupon.user_name}</td>
                        <td className="p-3 font-mono text-xs text-foreground">{coupon.code}</td>
                        <td className="p-3 font-body text-sm">
                          {isNoWin ? (
                            <span className="text-muted-foreground italic">Não ganhou</span>
                          ) : isService ? (
                            <span className="font-bold text-primary">🎁 Sessão grátis</span>
                          ) : (
                            <span className="font-bold text-primary">{coupon.discount_value}% OFF</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isNoWin ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <input
                              type="date"
                              value={coupon.expires_at.slice(0, 10)}
                              onChange={(e) => updateExpiry(coupon.id, e.target.value)}
                              className="h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                              title="Editar validade"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          {isNoWin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase">
                              <XCircle className="w-3 h-3" /> Sem prêmio
                            </span>
                          ) : coupon.is_used ? (
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
                            {!isNoWin && !coupon.is_used && !expired && (
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
              {coupons.map((coupon) => {
                const isNoWin = coupon.code.startsWith("BV-NADA");
                const isService = coupon.discount_type === "service" || coupon.code.startsWith("BV-SRV");
                const expired = new Date(coupon.expires_at) < new Date();
                return (
                  <div key={coupon.id} className={`p-4 space-y-2 ${isNoWin ? "opacity-70" : ""}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-body text-sm font-semibold text-foreground truncate">{coupon.user_name}</p>
                      {isNoWin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase flex-shrink-0">
                          <XCircle className="w-3 h-3" /> Sem prêmio
                        </span>
                      ) : coupon.is_used ? (
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
                          {isNoWin ? "Não ganhou" : isService ? "🎁 Sessão grátis" : `${coupon.discount_value}% OFF`}
                        </p>
                        {!isNoWin && (
                          <div className="mt-1 flex items-center gap-2">
                            <label className="font-body text-[10px] text-muted-foreground">Validade:</label>
                            <input
                              type="date"
                              value={coupon.expires_at.slice(0, 10)}
                              onChange={(e) => updateExpiry(coupon.id, e.target.value)}
                              className="h-7 px-2 rounded-md border border-input bg-background text-xs text-foreground"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!isNoWin && !coupon.is_used && !expired && (
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
        <WelcomeRoulettePreview items={items} onClose={() => setShowPreview(false)} />
      )}

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          services={services}
          onClose={() => setShowAddModal(false)}
          onAdd={addItemFromPicker}
        />
      )}
    </div>
  );
};

interface AddItemModalProps {
  services: { slug: string; title: string }[];
  onClose: () => void;
  onAdd: (item: Omit<RouletteItem, "id">) => void;
}

const AddItemModal = ({ services, onClose, onAdd }: AddItemModalProps) => {
  const [tab, setTab] = useState<"discount" | "service" | "none">("discount");
  const [discount, setDiscount] = useState<number>(10);
  const [customDiscount, setCustomDiscount] = useState<string>("");
  const [serviceSlug, setServiceSlug] = useState<string>("");
  const [weight, setWeight] = useState<number>(10);
  const [expiresDays, setExpiresDays] = useState<number>(30);
  const [label, setLabel] = useState<string>("");

  const handleAdd = () => {
    if (tab === "discount") {
      const finalDiscount = customDiscount ? Math.max(1, Math.min(100, Number(customDiscount) || 0)) : discount;
      if (!finalDiscount) {
        toast.error("Informe um valor de desconto válido.");
        return;
      }
      onAdd({
        label: label || `${finalDiscount}% OFF`,
        type: "discount",
        value: finalDiscount,
        weight: Math.max(0, weight),
        enabled: true,
        expiresDays: Math.max(1, expiresDays),
      });
    } else if (tab === "service") {
      if (!serviceSlug) {
        toast.error("Selecione um serviço.");
        return;
      }
      const svc = services.find((s) => s.slug === serviceSlug);
      onAdd({
        label: label || `${svc?.title} Grátis`,
        type: "service",
        value: 0,
        weight: Math.max(0, weight),
        enabled: true,
        expiresDays: Math.max(1, expiresDays),
        serviceSlug,
        serviceTitle: svc?.title,
      });
    } else {
      onAdd({
        label: label || "Tente novamente",
        type: "none",
        value: 0,
        weight: Math.max(0, weight),
        enabled: true,
        expiresDays: 30,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="font-heading text-sm font-bold text-foreground">Adicionar item à roleta</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <XCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type tabs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "discount" as const, label: "Desconto %", icon: Percent },
              { id: "service" as const, label: "Serviço grátis", icon: Gift },
              { id: "none" as const, label: "Sem prêmio", icon: XCircle },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-body text-[11px] font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Discount picker */}
          {tab === "discount" && (
            <div className="space-y-3">
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-2 block">
                  Escolha um valor de desconto
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DISCOUNT_PRESETS.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setDiscount(d); setCustomDiscount(""); }}
                      className={`p-3 rounded-xl border font-heading text-sm font-bold transition-all ${
                        discount === d && !customDiscount
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-foreground hover:bg-muted"
                      }`}
                    >
                      {d}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                  Ou valor personalizado (%)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  placeholder="ex: 35"
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* Service picker */}
          {tab === "service" && (
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-2 block">
                Escolha um serviço disponível
              </label>
              {services.length === 0 ? (
                <p className="font-body text-xs text-muted-foreground p-4 bg-muted/30 rounded-xl text-center">
                  Nenhum serviço ativo cadastrado.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {services.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setServiceSlug(s.slug)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        serviceSlug === s.slug
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:bg-muted"
                      }`}
                    >
                      <p className="font-body text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{s.slug}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Common fields */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                Texto exibido na roleta (opcional)
              </label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={
                  tab === "discount"
                    ? `${customDiscount || discount}% OFF`
                    : tab === "service"
                    ? "Serviço Grátis"
                    : "Tente novamente"
                }
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                  Peso (chance relativa)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9"
                />
              </div>
              {tab !== "none" && (
                <div>
                  <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                    Validade (dias)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(Math.max(1, Number(e.target.value) || 1))}
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2 justify-end sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd} className="gap-1">
            <Plus className="w-4 h-4" /> Adicionar à roleta
          </Button>
        </div>
      </div>
    </div>
  );
};

import WelcomeRouletteComponent from "@/components/WelcomeRoulette";

const WelcomeRoulettePreview = ({ items, onClose }: { items: RouletteItem[]; onClose: () => void }) => {
  return <WelcomeRouletteComponent testMode previewItems={items} onClose={onClose} />;
};

export default AdminWelcomeRoulette;
