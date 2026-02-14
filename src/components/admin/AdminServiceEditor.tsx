import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Pencil, X, Plus, Trash2, Upload, Check,
  Clock, CreditCard, CalendarCheck, ChevronRight, Star, CalendarPlus,
  Loader2, Eye, EyeOff, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DBService } from "@/hooks/useServices";
import { useServicePrices, formatCents, ServicePrice } from "@/hooks/useServicePrices";
import { getIconByName } from "@/lib/iconMap";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const ICON_OPTIONS = [
  "Droplets", "Snowflake", "Syringe", "Wind", "Gem", "CircleDot",
  "HandMetal", "Waves", "Sun", "Sparkles", "Zap", "ShieldCheck",
  "Heart", "Star", "Flower2", "Scissors", "Eye", "Smile",
];

interface Props {
  service: DBService;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type EditingSection = 
  | "title" | "icon" | "image" | "short_description" | "full_description" 
  | "benefits" | "duration" | "price_label" | "sessions_label" | "settings"
  | `plan-${string}` | "new-plan" | null;

const generateSlug = (title: string) =>
  title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminServiceEditor = ({ service: initialService, isNew, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const [service, setService] = useState<DBService>({ ...initialService, benefits: [...initialService.benefits] });
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(isNew);
  const { prices, loading: pricesLoading, refetch: refetchPrices } = useServicePrices(isNew ? undefined : service.slug);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ServicePrice>>>({});
  const [newPlan, setNewPlan] = useState({ plan_name: "", sessions: 1, price_per_session_cents: 0, total_price_cents: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Icon = getIconByName(service.icon_name);

  const updateField = <K extends keyof DBService>(field: K, value: DBService[K]) => {
    const updated = { ...service, [field]: value };
    if (field === "title" && isNew) updated.slug = generateSlug(value as string);
    setService(updated);
    setHasChanges(true);
  };

  const convertToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Falha na conversão"))),
          "image/webp",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande. Máximo 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const path = `${service.slug || "new"}-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("service-images").upload(path, webpBlob, { upsert: true, contentType: "image/webp" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("service-images").getPublicUrl(path);
      updateField("image_url", urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!service.title) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = service.slug || generateSlug(service.title);
    const payload = {
      slug,
      title: service.title,
      icon_name: service.icon_name,
      short_description: service.short_description,
      full_description: service.full_description,
      benefits: service.benefits.filter((b) => b.trim()),
      duration: service.duration,
      price_label: service.price_label,
      sessions_label: service.sessions_label,
      image_url: service.image_url,
      sort_order: service.sort_order,
      is_active: service.is_active,
    };

    let saveError = false;
    if (isNew) {
      const { error } = await supabase.from("services").insert(payload);
      if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); saveError = true; }
    } else {
      const { error } = await supabase.from("services").update(payload).eq("id", service.id);
      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); saveError = true; }
    }

    // Save price changes
    if (!saveError) {
      for (const [id, changes] of Object.entries(editedPrices)) {
        const original = prices.find((p) => p.id === id);
        if (!original) continue;
        const sessions = changes.sessions ?? original.sessions;
        const pps = changes.price_per_session_cents ?? original.price_per_session_cents;
        const total = changes.total_price_cents ?? pps * sessions;
        await supabase.from("service_prices").update({ sessions, price_per_session_cents: pps, total_price_cents: total }).eq("id", id);
      }
      toast({ title: "Serviço salvo com sucesso! ✅" });
      setHasChanges(false);
      setEditedPrices({});
      onSaved();
    }
    setSaving(false);
  };

  const handleAddPlan = async () => {
    if (!newPlan.plan_name || isNew) return;
    const { error } = await supabase.from("service_prices").insert({
      service_slug: service.slug,
      plan_name: newPlan.plan_name,
      sessions: newPlan.sessions,
      price_per_session_cents: newPlan.price_per_session_cents,
      total_price_cents: newPlan.total_price_cents || newPlan.price_per_session_cents * newPlan.sessions,
    });
    if (error) {
      toast({ title: "Erro ao adicionar plano", variant: "destructive" });
    } else {
      toast({ title: "Plano adicionado ✅" });
      setNewPlan({ plan_name: "", sessions: 1, price_per_session_cents: 0, total_price_cents: 0 });
      setEditingSection(null);
      refetchPrices();
    }
  };

  const handleDeletePlan = async (id: string) => {
    const { error } = await supabase.from("service_prices").delete().eq("id", id);
    if (!error) { refetchPrices(); toast({ title: "Plano removido ✅" }); }
  };

  const EditableWrapper = ({ section, children, className = "" }: { section: EditingSection; children: React.ReactNode; className?: string }) => (
    <div
      className={`group relative cursor-pointer rounded-xl transition-all ${
        editingSection === section ? "ring-2 ring-primary/50 ring-offset-2" : "hover:ring-2 hover:ring-primary/20 hover:ring-offset-1"
      } ${className}`}
      onClick={(e) => { e.stopPropagation(); setEditingSection(editingSection === section ? null : section); }}
    >
      {children}
      {editingSection !== section && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Pencil className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );

  const planOrder = ["Essencial", "Premium", "VIP"];
  const sortedPrices = [...prices].sort((a, b) => planOrder.indexOf(a.plan_name) - planOrder.indexOf(b.plan_name));

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      {/* Top toolbar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={onClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingSection(editingSection === "settings" ? null : "settings")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Configurações"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { updateField("is_active", !service.is_active); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium border transition-colors ${
              service.is_active ? "border-primary/20 text-primary" : "border-muted-foreground/20 text-muted-foreground"
            }`}
          >
            {service.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {service.is_active ? "Ativo" : "Inativo"}
          </button>
          <Button onClick={handleSave} disabled={saving || (!hasChanges && Object.keys(editedPrices).length === 0)} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Salvando..." : "Salvar Tudo"}
          </Button>
        </div>
      </div>

      {/* Settings drawer */}
      <AnimatePresence>
        {editingSection === "settings" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-muted/50"
          >
            <div className="max-w-2xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Slug (URL)</label>
                <Input value={service.slug} onChange={(e) => updateField("slug", e.target.value)} className="font-body text-xs h-8" />
              </div>
              <div>
                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Ordem</label>
                <Input type="number" value={service.sort_order} onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)} className="font-body text-xs h-8 w-20" />
              </div>
              <div className="col-span-2">
                <label className="font-body text-[11px] text-muted-foreground mb-1 block">Ícone</label>
                <div className="flex flex-wrap gap-1">
                  {ICON_OPTIONS.map((icon) => {
                    const IconOpt = getIconByName(icon);
                    return (
                      <button
                        key={icon}
                        onClick={() => updateField("icon_name", icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          service.icon_name === icon ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-primary/10"
                        }`}
                        title={icon}
                      >
                        <IconOpt className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== VISUAL PAGE PREVIEW ===== */}
      <div onClick={() => setEditingSection(null)}>

        {/* Hero banner */}
        <section className="relative pt-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary-foreground opacity-[0.08]" />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-primary-foreground opacity-[0.05]" />

          <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-20">
            <div className="flex items-center gap-2 mb-8 font-body text-sm text-primary-foreground/60">
              <span>Início</span>
              <ChevronRight className="w-3 h-3" />
              <span>Serviços</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-primary-foreground">{service.title || "Novo Serviço"}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <EditableWrapper section="icon">
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-3xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
                  <Icon className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" strokeWidth={1.5} />
                </div>
              </EditableWrapper>

              <EditableWrapper section="title" className="flex-1">
                {editingSection === "title" ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={service.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      className="font-heading text-2xl md:text-4xl font-bold bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30"
                      placeholder="Nome do serviço"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-2">
                      Tratamento Estético
                    </p>
                    <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
                      {service.title || <span className="opacity-30">Título do Serviço</span>}
                    </h1>
                  </div>
                )}
              </EditableWrapper>
            </div>
          </div>
        </section>

        {/* About section: image + description */}
        <section className="max-w-6xl mx-auto px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
            {/* Image */}
            <EditableWrapper section="image" className="flex-shrink-0">
              {editingSection === "image" ? (
                <div className="w-[260px] md:w-[320px] space-y-3" onClick={(e) => e.stopPropagation()}>
                  {service.image_url && (
                    <img src={service.image_url} alt="" className="max-w-full rounded-xl" />
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 text-sm font-body text-primary cursor-pointer hover:bg-primary/5 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Enviando..." : "Trocar imagem"}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {service.image_url && (
                    <button onClick={() => updateField("image_url", null)} className="text-xs font-body text-destructive hover:underline">
                      Remover imagem
                    </button>
                  )}
                </div>
              ) : (
                service.image_url ? (
                  <img src={service.image_url} alt={service.title} className="max-w-[260px] md:max-w-[320px] rounded-xl" />
                ) : (
                  <div className="w-[260px] md:w-[320px] h-48 rounded-xl bg-muted border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Upload className="w-8 h-8" />
                    <span className="font-body text-sm">Clique para adicionar imagem</span>
                  </div>
                )
              )}
            </EditableWrapper>

            {/* Description */}
            <div className="flex-1 space-y-4">
              <EditableWrapper section="short_description">
                <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">
                  Sobre o tratamento
                </p>
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {service.title}
                </h2>
              </EditableWrapper>

              <EditableWrapper section="full_description">
                {editingSection === "full_description" ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Textarea
                      value={service.full_description}
                      onChange={(e) => updateField("full_description", e.target.value)}
                      rows={6}
                      className="font-body text-sm leading-relaxed"
                      placeholder="Descrição completa do tratamento..."
                      autoFocus
                    />
                    <div className="mt-2">
                      <label className="font-body text-[11px] text-muted-foreground">Descrição curta (card)</label>
                      <Textarea
                        value={service.short_description}
                        onChange={(e) => updateField("short_description", e.target.value)}
                        rows={2}
                        className="font-body text-xs mt-1"
                        placeholder="Descrição curta para o card..."
                      />
                    </div>
                  </div>
                ) : (
                  <p className="font-body text-muted-foreground text-sm md:text-base leading-[1.9]">
                    {service.full_description || <span className="opacity-40 italic">Clique para adicionar a descrição completa...</span>}
                  </p>
                )}
              </EditableWrapper>
            </div>
          </div>
        </section>

        {/* Benefits + Sidebar */}
        <section className="max-w-6xl mx-auto px-6 pb-12 md:pb-20">
          <div className="grid lg:grid-cols-5 gap-10 md:gap-16">
            {/* Benefits */}
            <div className="lg:col-span-3">
              <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">Vantagens</p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">Benefícios</h2>

              <EditableWrapper section="benefits">
                {editingSection === "benefits" ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    {service.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <Input
                          value={benefit}
                          onChange={(e) => {
                            const benefits = [...service.benefits];
                            benefits[idx] = e.target.value;
                            updateField("benefits", benefits);
                          }}
                          placeholder={`Benefício ${idx + 1}`}
                          className="font-body text-sm flex-1"
                          autoFocus={idx === service.benefits.length - 1}
                        />
                        <button
                          onClick={() => updateField("benefits", service.benefits.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateField("benefits", [...service.benefits, ""])}
                      className="flex items-center gap-1.5 text-xs font-body text-primary hover:underline mt-2"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar benefício
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {service.benefits.length > 0 ? service.benefits.map((benefit, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-rose-soft"
                      >
                        <div className="w-6 h-6 mt-0.5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <p className="font-body text-foreground text-sm leading-relaxed">{benefit}</p>
                      </div>
                    )) : (
                      <div className="col-span-2 p-6 text-center text-muted-foreground font-body text-sm opacity-50 italic">
                        Clique para adicionar benefícios...
                      </div>
                    )}
                  </div>
                )}
              </EditableWrapper>
            </div>

            {/* Info sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm space-y-5">
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">Informações</h3>

                {[
                  { icon: Clock, label: "Duração", field: "duration" as const, value: service.duration, placeholder: "60 minutos" },
                  { icon: CreditCard, label: "Investimento", field: "price_label" as const, value: service.price_label, placeholder: "A partir de R$ 150" },
                  { icon: CalendarCheck, label: "Sessões", field: "sessions_label" as const, value: service.sessions_label, placeholder: "Pacote de 10 sessões" },
                ].map(({ icon: InfoIcon, label, field, value, placeholder }) => (
                  <EditableWrapper key={field} section={field}>
                    {editingSection === field ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-soft" onClick={(e) => e.stopPropagation()}>
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <InfoIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">{label}</p>
                          <Input
                            value={value}
                            onChange={(e) => updateField(field, e.target.value)}
                            placeholder={placeholder}
                            className="font-body text-sm h-8 mt-0.5"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-rose-soft">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <InfoIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">{label}</p>
                          <p className="font-body text-sm font-semibold text-foreground">
                            {value || <span className="opacity-40 italic font-normal">{placeholder}</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </EditableWrapper>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing plans */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-24">
          <div className="text-center mb-10">
            <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">Pacotes</p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
              Escolha o seu <span className="text-pink-vibrant">Plano</span>
            </h2>
          </div>

          {isNew ? (
            <div className="bg-muted/50 rounded-2xl p-8 text-center">
              <p className="font-body text-sm text-muted-foreground">Salve o serviço primeiro para adicionar planos de preço.</p>
            </div>
          ) : pricesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedPrices.map((plan) => {
                const edited = editedPrices[plan.id];
                const sessions = edited?.sessions ?? plan.sessions;
                const pps = edited?.price_per_session_cents ?? plan.price_per_session_cents;
                const total = edited?.total_price_cents ?? plan.total_price_cents;
                const isHighlight = plan.plan_name === "Premium";
                const isEditingPlan = editingSection === `plan-${plan.id}`;

                return (
                  <EditableWrapper key={plan.id} section={`plan-${plan.id}` as EditingSection}>
                    <div className={`relative rounded-3xl p-6 md:p-8 border ${
                      isHighlight
                        ? "bg-gradient-to-br from-primary to-[hsl(var(--pink-dark))] text-primary-foreground border-transparent shadow-xl"
                        : "bg-card text-foreground border-border shadow-sm"
                    }`}>
                      {isHighlight && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-foreground text-primary font-body text-[10px] font-bold uppercase tracking-[0.2em] rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Mais popular
                        </div>
                      )}

                      {isEditingPlan ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <h3 className="font-heading text-lg font-bold">{plan.plan_name}</h3>
                          <div>
                            <label className={`font-body text-[11px] mb-1 block ${isHighlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Sessões</label>
                            <Input
                              type="number" min={1} value={sessions}
                              onChange={(e) => { setEditedPrices(p => ({ ...p, [plan.id]: { ...p[plan.id], sessions: parseInt(e.target.value) || 1 } })); setHasChanges(true); }}
                              className={`h-8 font-body text-sm ${isHighlight ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : ""}`}
                            />
                          </div>
                          <div>
                            <label className={`font-body text-[11px] mb-1 block ${isHighlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Preço/sessão (R$)</label>
                            <Input
                              type="text" value={(pps / 100).toFixed(2).replace(".", ",")}
                              onChange={(e) => {
                                const v = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                                setEditedPrices(p => ({ ...p, [plan.id]: { ...p[plan.id], price_per_session_cents: v } })); setHasChanges(true);
                              }}
                              className={`h-8 font-body text-sm ${isHighlight ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : ""}`}
                            />
                          </div>
                          <div>
                            <label className={`font-body text-[11px] mb-1 block ${isHighlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Total (R$)</label>
                            <Input
                              type="text" value={(total / 100).toFixed(2).replace(".", ",")}
                              onChange={(e) => {
                                const v = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                                setEditedPrices(p => ({ ...p, [plan.id]: { ...p[plan.id], total_price_cents: v } })); setHasChanges(true);
                              }}
                              className={`h-8 font-body text-sm ${isHighlight ? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" : ""}`}
                            />
                          </div>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className={`flex items-center gap-1 text-xs font-body ${isHighlight ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-destructive hover:underline"}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir plano
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-heading text-lg md:text-xl font-bold mb-1">{plan.plan_name}</h3>
                          <p className={`font-body text-xs mb-4 ${isHighlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {sessions} sessões
                          </p>
                          <div className="mb-1">
                            <span className="font-heading text-3xl md:text-4xl font-bold">{formatCents(pps)}</span>
                            <span className={`font-body text-sm ml-1 ${isHighlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/sessão</span>
                          </div>
                          <p className={`font-body text-xs mb-6 ${isHighlight ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                            Total: {formatCents(total)}
                          </p>
                          <div className={`flex items-center justify-center gap-2 w-full py-3.5 font-body text-sm font-bold rounded-2xl uppercase tracking-wider ${
                            isHighlight ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                          }`}>
                            <CalendarPlus className="w-4 h-4" />
                            Agendar Agora
                          </div>
                        </>
                      )}
                    </div>
                  </EditableWrapper>
                );
              })}

              {/* Add plan card */}
              {!isNew && (
                <EditableWrapper section="new-plan">
                  {editingSection === "new-plan" ? (
                    <div className="rounded-3xl p-6 md:p-8 border-2 border-dashed border-primary/30 bg-primary/5 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <h3 className="font-heading text-lg font-bold text-foreground">Novo Plano</h3>
                      <div>
                        <label className="font-body text-[11px] text-muted-foreground mb-1 block">Nome</label>
                        <Input value={newPlan.plan_name} onChange={(e) => setNewPlan(p => ({ ...p, plan_name: e.target.value }))} placeholder="Ex: Premium" className="h-8 font-body text-sm" />
                      </div>
                      <div>
                        <label className="font-body text-[11px] text-muted-foreground mb-1 block">Sessões</label>
                        <Input type="number" min={1} value={newPlan.sessions} onChange={(e) => setNewPlan(p => ({ ...p, sessions: parseInt(e.target.value) || 1 }))} className="h-8 font-body text-sm" />
                      </div>
                      <div>
                        <label className="font-body text-[11px] text-muted-foreground mb-1 block">Preço/sessão (R$)</label>
                        <Input type="text" value={(newPlan.price_per_session_cents / 100).toFixed(2).replace(".", ",")}
                          onChange={(e) => {
                            const v = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                            setNewPlan(p => ({ ...p, price_per_session_cents: v }));
                          }} className="h-8 font-body text-sm" />
                      </div>
                      <div>
                        <label className="font-body text-[11px] text-muted-foreground mb-1 block">Total (R$)</label>
                        <Input type="text" value={(newPlan.total_price_cents / 100).toFixed(2).replace(".", ",")}
                          onChange={(e) => {
                            const v = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100) || 0;
                            setNewPlan(p => ({ ...p, total_price_cents: v }));
                          }} className="h-8 font-body text-sm" />
                      </div>
                      <Button onClick={handleAddPlan} size="sm" className="w-full gap-1.5" disabled={!newPlan.plan_name}>
                        <Check className="w-3.5 h-3.5" />
                        Adicionar Plano
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-3xl p-6 md:p-8 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 min-h-[280px] text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                      <Plus className="w-8 h-8" />
                      <span className="font-body text-sm font-medium">Adicionar Plano</span>
                    </div>
                  )}
                </EditableWrapper>
              )}
            </div>
          )}
        </section>

        {/* CTA Preview */}
        <section className="max-w-3xl mx-auto px-6 pb-16 md:pb-24">
          <div className="bg-gradient-to-br from-primary to-[hsl(var(--pink-dark))] rounded-3xl p-8 md:p-10 text-primary-foreground text-center">
            <h3 className="font-heading text-xl md:text-2xl font-bold mb-3">Agende seu horário</h3>
            <p className="font-body text-primary-foreground/70 text-sm md:text-base mb-8 leading-relaxed max-w-lg mx-auto">
              Escolha o melhor dia e horário para o seu tratamento diretamente pelo nosso sistema de agendamento.
            </p>
            <div className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary-foreground text-primary font-body text-sm font-bold rounded-2xl uppercase tracking-wider">
              <CalendarPlus className="w-5 h-5" />
              Agendar Agora
            </div>
          </div>
        </section>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
    </div>
  );
};

export default AdminServiceEditor;
