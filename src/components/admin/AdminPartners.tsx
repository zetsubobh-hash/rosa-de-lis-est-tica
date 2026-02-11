import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, X, Save, Search, Users, Phone,
  Clock, Eye, EyeOff, Loader2, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServices } from "@/hooks/useServices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PartnerAvatarUpload from "@/components/admin/PartnerAvatarUpload";

interface Partner {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url: string | null;
  commission_pct: number;
  salary_cents: number;
  work_days: string[];
  work_start: string;
  work_end: string;
  is_active: boolean;
  specialties?: string[];
}

const capitalizeWords = (value: string) =>
  value.replace(/\b\w/g, (char) => char.toUpperCase());

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const formatted = (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
};

const parseCurrency = (formatted: string): number => {
  const digits = formatted.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
};

const WEEK_DAYS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const AdminPartners = () => {
  const { toast } = useToast();
  const { services } = useServices(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partner | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  

  const fetchPartners = async () => {
    setLoading(true);
    const { data: partnersData } = await supabase
      .from("partners")
      .select("*")
      .order("full_name");

    const { data: specialtiesData } = await supabase
      .from("partner_services")
      .select("partner_id, service_slug");

    const specMap: Record<string, string[]> = {};
    specialtiesData?.forEach((s: any) => {
      if (!specMap[s.partner_id]) specMap[s.partner_id] = [];
      specMap[s.partner_id].push(s.service_slug);
    });

    setPartners(
      (partnersData || []).map((p: any) => ({
        ...p,
        commission_pct: Number(p.commission_pct),
        specialties: specMap[p.id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchPartners(); }, []);

  const openNew = () => {
    setEditing({
      id: "",
      user_id: "",
      full_name: "",
      phone: "",
      avatar_url: null,
      commission_pct: 0,
      salary_cents: 0,
      work_days: ["seg", "ter", "qua", "qui", "sex"],
      work_start: "08:00",
      work_end: "18:00",
      is_active: true,
      specialties: [],
    });
    setIsNew(true);
  };

  const openEdit = (p: Partner) => {
    setEditing({ ...p, specialties: [...(p.specialties || [])] });
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.full_name) return;
    setSaving(true);

    // For new partners, we need to find or create a user
    // For simplicity, we'll create the partner record with a placeholder user_id
    // The admin will later link it to an existing user
    let userId = editing.user_id;

    if (isNew) {
      // Look up user by name in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("full_name", editing.full_name)
        .maybeSingle();

      if (profile) {
        userId = profile.user_id;
      } else {
        toast({ title: "Usuário não encontrado. O parceiro precisa ter uma conta cadastrada.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Give partner role
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: "partner" as any },
        { onConflict: "user_id,role" }
      );

      const { data: newPartner, error } = await supabase
        .from("partners")
        .insert({
          user_id: userId,
          full_name: editing.full_name,
          phone: editing.phone,
          avatar_url: editing.avatar_url,
          commission_pct: editing.commission_pct,
          salary_cents: editing.salary_cents,
          work_days: editing.work_days,
          work_start: editing.work_start,
          work_end: editing.work_end,
          is_active: editing.is_active,
        })
        .select("id")
        .single();

      if (error) {
        toast({ title: "Erro ao criar parceiro", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Save specialties
      if (editing.specialties && editing.specialties.length > 0) {
        await supabase.from("partner_services").insert(
          editing.specialties.map((slug) => ({ partner_id: newPartner.id, service_slug: slug }))
        );
      }

      toast({ title: "Parceiro cadastrado ✅" });
    } else {
      const { error } = await supabase
        .from("partners")
        .update({
          full_name: editing.full_name,
          phone: editing.phone,
          avatar_url: editing.avatar_url,
          commission_pct: editing.commission_pct,
          salary_cents: editing.salary_cents,
          work_days: editing.work_days,
          work_start: editing.work_start,
          work_end: editing.work_end,
          is_active: editing.is_active,
        })
        .eq("id", editing.id);

      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Update specialties
      await supabase.from("partner_services").delete().eq("partner_id", editing.id);
      if (editing.specialties && editing.specialties.length > 0) {
        await supabase.from("partner_services").insert(
          editing.specialties.map((slug) => ({ partner_id: editing.id, service_slug: slug }))
        );
      }

      toast({ title: "Parceiro atualizado ✅" });
    }

    setEditing(null);
    setSaving(false);
    fetchPartners();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("partners").delete().eq("id", id);
    if (!error) {
      toast({ title: "Parceiro excluído ✅" });
      fetchPartners();
    }
  };


  const toggleSpecialty = (slug: string) => {
    if (!editing) return;
    const specs = editing.specialties || [];
    setEditing({
      ...editing,
      specialties: specs.includes(slug) ? specs.filter((s) => s !== slug) : [...specs, slug],
    });
  };

  const toggleWorkDay = (day: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      work_days: editing.work_days.includes(day)
        ? editing.work_days.filter((d) => d !== day)
        : [...editing.work_days, day],
    });
  };

  const filtered = partners.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
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
          Parceiros ({partners.length})
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
            Novo Parceiro
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum parceiro encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow ${!p.is_active ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-heading text-sm font-bold text-primary">
                      {getInitials(p.full_name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                    {!p.is_active && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted-foreground/10 text-muted-foreground">Inativo</span>
                    )}
                  </div>
                  {p.phone && (
                    <p className="font-body text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {p.phone}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.work_start} - {p.work_end}
                    </span>
                    <span className="font-semibold text-primary">{p.commission_pct}%</span>
                  </div>
                  {p.specialties && p.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.specialties.map((slug) => {
                        const svc = services.find((s) => s.slug === slug);
                        return (
                          <span key={slug} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                            {svc?.title || slug}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.phone && (
                    <>
                      <a
                        href={`tel:${p.phone.replace(/\D/g, "")}`}
                        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/55${p.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
                  {isNew ? "Novo Parceiro" : "Editar Parceiro"}
                </h3>
                <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Avatar */}
                <div className="flex justify-center">
                  <PartnerAvatarUpload
                    avatarUrl={editing.avatar_url}
                    fallbackInitials={editing.full_name ? getInitials(editing.full_name) : "?"}
                    onAvatarChange={(url) => setEditing({ ...editing!, avatar_url: url })}
                    size={80}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Nome completo *</label>
                  <Input
                    value={editing.full_name}
                    onChange={(e) => setEditing({ ...editing, full_name: capitalizeWords(e.target.value) })}
                    placeholder="Nome do parceiro(a)"
                    className="font-body"
                  />
                  {isNew && (
                    <p className="font-body text-[11px] text-muted-foreground mt-1">
                      O nome deve ser exatamente igual ao cadastro do usuário no sistema.
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Telefone</label>
                  <Input
                    value={editing.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setEditing({ ...editing, phone: formatted });
                    }}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    maxLength={15}
                    className="font-body"
                  />
                </div>

                {/* Commission & Salary */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Comissão (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={editing.commission_pct}
                      onChange={(e) => setEditing({ ...editing, commission_pct: parseFloat(e.target.value) || 0 })}
                      className="font-body"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Salário (R$)</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={editing.salary_cents === 0 ? "" : formatCurrency(String(editing.salary_cents))}
                      onChange={(e) => {
                        const cents = parseCurrency(e.target.value);
                        setEditing({ ...editing, salary_cents: cents });
                      }}
                      placeholder="0,00"
                      className="font-body"
                    />
                  </div>
                </div>

                {/* Work days */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Dias de trabalho</label>
                  <div className="flex gap-1.5">
                    {WEEK_DAYS.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => toggleWorkDay(d.key)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          editing.work_days.includes(d.key)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Work hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Início</label>
                    <Input
                      type="time"
                      value={editing.work_start}
                      onChange={(e) => setEditing({ ...editing, work_start: e.target.value })}
                      className="font-body"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Fim</label>
                    <Input
                      type="time"
                      value={editing.work_end}
                      onChange={(e) => setEditing({ ...editing, work_end: e.target.value })}
                      className="font-body"
                    />
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <label className="font-body text-xs font-medium text-muted-foreground mb-1.5 block">Especialidades</label>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((svc) => (
                      <button
                        key={svc.slug}
                        onClick={() => toggleSpecialty(svc.slug)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          editing.specialties?.includes(svc.slug)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-primary/10"
                        }`}
                      >
                        {svc.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-medium border transition-colors ${
                      editing.is_active ? "border-primary/20 text-primary" : "border-muted-foreground/20 text-muted-foreground"
                    }`}
                  >
                    {editing.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {editing.is_active ? "Ativo" : "Inativo"}
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !editing.full_name} className="gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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

export default AdminPartners;
