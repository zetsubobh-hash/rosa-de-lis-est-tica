import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Save, GripVertical, Eye, EyeOff,
  Upload, ChevronDown, ChevronUp, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServices, DBService } from "@/hooks/useServices";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const ICON_OPTIONS = [
  "Droplets", "Snowflake", "Syringe", "Wind", "Gem", "CircleDot",
  "HandMetal", "Waves", "Sun", "Sparkles", "Zap", "ShieldCheck",
  "Heart", "Star", "Flower2", "Scissors", "Eye", "Smile",
];

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const emptyService: Omit<DBService, "id" | "created_at" | "updated_at"> = {
  slug: "",
  title: "",
  icon_name: "Sparkles",
  short_description: "",
  full_description: "",
  benefits: [""],
  duration: "",
  price_label: "",
  sessions_label: "",
  image_url: null,
  sort_order: 0,
  is_active: true,
};

const AdminServices = () => {
  const { toast } = useToast();
  const { services, loading, refetch } = useServices(true);
  const [editing, setEditing] = useState<DBService | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openNew = () => {
    const maxOrder = services.reduce((max, s) => Math.max(max, s.sort_order), 0);
    setEditing({
      ...emptyService,
      sort_order: maxOrder + 1,
      id: "",
      created_at: "",
      updated_at: "",
    } as DBService);
    setIsNew(true);
  };

  const openEdit = (service: DBService) => {
    setEditing({ ...service, benefits: [...service.benefits] });
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    const slug = editing.slug || generateSlug(editing.title);
    const payload = {
      slug,
      title: editing.title,
      icon_name: editing.icon_name,
      short_description: editing.short_description,
      full_description: editing.full_description,
      benefits: editing.benefits.filter((b) => b.trim()),
      duration: editing.duration,
      price_label: editing.price_label,
      sessions_label: editing.sessions_label,
      image_url: editing.image_url,
      sort_order: editing.sort_order,
      is_active: editing.is_active,
    };

    if (isNew) {
      const { error } = await supabase.from("services").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar serviço", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Serviço criado ✅" });
        setEditing(null);
        refetch();
      }
    } else {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Serviço atualizado ✅" });
        setEditing(null);
        refetch();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Serviço excluído ✅" });
      refetch();
    }
  };

  const handleToggleActive = async (service: DBService) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    if (error) {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    } else {
      refetch();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${editing.slug || "new"}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("service-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage
        .from("service-images")
        .getPublicUrl(path);
      setEditing({ ...editing, image_url: urlData.publicUrl });
    }
    setUploading(false);
  };

  const updateField = <K extends keyof DBService>(field: K, value: DBService[K]) => {
    if (!editing) return;
    const updated = { ...editing, [field]: value };
    if (field === "title" && isNew) {
      updated.slug = generateSlug(value as string);
    }
    setEditing(updated);
  };

  const updateBenefit = (index: number, value: string) => {
    if (!editing) return;
    const benefits = [...editing.benefits];
    benefits[index] = value;
    setEditing({ ...editing, benefits });
  };

  const addBenefit = () => {
    if (!editing) return;
    setEditing({ ...editing, benefits: [...editing.benefits, ""] });
  };

  const removeBenefit = (index: number) => {
    if (!editing) return;
    setEditing({ ...editing, benefits: editing.benefits.filter((_, i) => i !== index) });
  };

  const filtered = services.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="font-heading text-lg font-bold text-foreground">
          Serviços ({services.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-body w-44"
              placeholder="Buscar..."
            />
          </div>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Services list */}
      <div className="space-y-2">
        {filtered.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`bg-muted rounded-xl border border-border overflow-hidden transition-shadow hover:shadow-sm ${
              !service.is_active ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm font-bold text-foreground truncate">
                    {service.title}
                  </p>
                  {!service.is_active && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted-foreground/10 text-muted-foreground">
                      Inativo
                    </span>
                  )}
                </div>
                <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                  {service.short_description}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  {expandedId === service.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleToggleActive(service)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                  title={service.is_active ? "Desativar" : "Ativar"}
                >
                  {service.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(service)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <AnimatePresence>
              {expandedId === service.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-body">
                      <div>
                        <span className="text-muted-foreground">Slug:</span>
                        <p className="text-foreground font-medium">{service.slug}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duração:</span>
                        <p className="text-foreground font-medium">{service.duration}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preço:</span>
                        <p className="text-foreground font-medium">{service.price_label}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ícone:</span>
                        <p className="text-foreground font-medium">{service.icon_name}</p>
                      </div>
                    </div>
                    {service.benefits.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs text-muted-foreground font-body">Benefícios:</span>
                        <ul className="mt-1 space-y-0.5">
                          {service.benefits.map((b, j) => (
                            <li key={j} className="text-xs font-body text-foreground">• {b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-heading text-base font-bold text-foreground">
                  {isNew ? "Novo Serviço" : "Editar Serviço"}
                </h3>
                <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
                  <Input
                    value={editing.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Ex: Drenagem Linfática"
                    className="font-body"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Slug (URL)</label>
                  <Input
                    value={editing.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    placeholder="drenagem-linfatica"
                    className="font-body text-xs"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Ícone</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => updateField("icon_name", icon)}
                        className={`py-2 rounded-lg text-[10px] font-medium transition-all ${
                          editing.icon_name === icon
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Imagem</label>
                  {editing.image_url && (
                    <img src={editing.image_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs font-body text-muted-foreground cursor-pointer hover:border-primary/30 hover:text-primary transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Enviando..." : "Escolher imagem"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Short description */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Descrição Curta</label>
                  <Textarea
                    value={editing.short_description}
                    onChange={(e) => updateField("short_description", e.target.value)}
                    rows={2}
                    className="font-body text-xs"
                  />
                </div>

                {/* Full description */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Descrição Completa</label>
                  <Textarea
                    value={editing.full_description}
                    onChange={(e) => updateField("full_description", e.target.value)}
                    rows={4}
                    className="font-body text-xs"
                  />
                </div>

                {/* Duration, Price, Sessions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Duração</label>
                    <Input
                      value={editing.duration}
                      onChange={(e) => updateField("duration", e.target.value)}
                      placeholder="60 minutos"
                      className="font-body text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Preço (label)</label>
                    <Input
                      value={editing.price_label}
                      onChange={(e) => updateField("price_label", e.target.value)}
                      placeholder="A partir de R$ 150,00"
                      className="font-body text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Sessões (label)</label>
                    <Input
                      value={editing.sessions_label}
                      onChange={(e) => updateField("sessions_label", e.target.value)}
                      placeholder="Pacote de 10 sessões"
                      className="font-body text-xs"
                    />
                  </div>
                </div>

                {/* Sort order */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Ordem de exibição</label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
                    className="font-body text-xs w-24"
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Benefícios</label>
                  <div className="space-y-2">
                    {editing.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={benefit}
                          onChange={(e) => updateBenefit(idx, e.target.value)}
                          placeholder={`Benefício ${idx + 1}`}
                          className="font-body text-xs flex-1"
                        />
                        <button
                          onClick={() => removeBenefit(idx)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addBenefit}
                      className="flex items-center gap-1 text-xs font-body text-primary hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar benefício
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !editing.title}
                  className="gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminServices;
