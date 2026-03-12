import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Phone, Mail, Calendar, Heart, FileText, History, Clock, Stethoscope, Cake, Ticket, CheckCircle2, Pencil, Save, Trash2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  avatarUrl: string | null;
}

interface ProfileData {
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  sex: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  last_seen: string | null;
  birth_date: string | null;
}

interface AnamnesisData {
  motivo_consulta: string | null;
  doencas: string[] | null;
  alergias: string[] | null;
  medicamentos: string | null;
  cirurgias: string | null;
  disturbios_hormonais: boolean | null;
  disturbios_hormonais_detalhe: string | null;
  gestante_amamentando: string | null;
  tabagismo: string | null;
  atividade_fisica: string | null;
  alimentacao: string | null;
  consumo_agua: string | null;
  consumo_alcool: string | null;
  qualidade_sono: string | null;
  nivel_estresse: string | null;
  tipo_pele: string | null;
  fototipo: string | null;
  grau_sensibilidade: string | null;
  problemas_pele: string[] | null;
  condicoes_esteticas: string[] | null;
  avaliacao_corporal: string | null;
  area_tratada: string | null;
  tratamentos_anteriores: string | null;
  observacoes: string | null;
  updated_at: string;
}

interface AppointmentData {
  id: string;
  service_title: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  session_number: number | null;
  partner_name?: string;
  notes: string | null;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
  pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", cls: "bg-emerald-100 text-emerald-700" },
};

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const formatDate = (d: string) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-body text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
};

const EditableRow = ({ icon: Icon, label, value, onChange, type = "text", placeholder }: { icon: any; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) => {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Icon className="w-4 h-4 text-primary mt-2.5 shrink-0" />
      <div className="flex-1">
        <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
};

const AnamnesisField = ({ label, value }: { label: string; value: any }) => {
  if (!value || (Array.isArray(value) && value.length === 0) || value === "" || value === "nao") return null;
  const display = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Sim" : "Não") : String(value);
  return (
    <div className="py-1.5">
      <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-body text-sm text-foreground">{display}</p>
    </div>
  );
};

const MASTER_ADMIN_ID = "4649913b-f48b-470e-b407-251803756157";

const ClientDetailModal = ({ open, onClose, userId, userName, avatarUrl }: Props) => {
  const isMasterAdmin = userId === MASTER_ADMIN_ID;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [coupons, setCoupons] = useState<{ id: string; code: string; discount_type: string; discount_value: number; expires_at: string; is_used: boolean; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingUsed, setMarkingUsed] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"all" | string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingHistory, setDeletingHistory] = useState(false);
  const { user } = useAuth();
  const [editData, setEditData] = useState({
    full_name: "",
    phone: "",
    email: "",
    address: "",
    sex: "",
    birth_date: "",
    username: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [profileRes, anamnesisRes, appointmentsRes, partnersRes, couponsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("anamnesis").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1),
      supabase.from("appointments").select("*").eq("user_id", userId).order("appointment_date", { ascending: false }),
      supabase.from("partners").select("id, full_name"),
      supabase.from("coupons").select("id, code, discount_type, discount_value, expires_at, is_used, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) {
      const p = profileRes.data as any;
      setProfile(p);
      setEditData({
        full_name: p.full_name || "",
        phone: p.phone || "",
        email: p.email || "",
        address: p.address || "",
        sex: (p.sex || "").toLowerCase(),
        birth_date: p.birth_date || "",
        username: p.username || "",
      });
    }
    if (anamnesisRes.data?.[0]) setAnamnesis(anamnesisRes.data[0] as any);
    else setAnamnesis(null);

    const partnerMap = new Map((partnersRes.data || []).map((p: any) => [p.id, p.full_name]));
    setAppointments(
      (appointmentsRes.data || []).map((a: any) => ({
        ...a,
        partner_name: a.partner_id ? partnerMap.get(a.partner_id) || "—" : undefined,
      }))
    );
    setCoupons((couponsRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) { setEditing(false); return; }
    loadData();
  }, [open, userId]);

  const handleSave = async () => {
    if (!editData.full_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const sexValue = editData.sex.trim().toLowerCase();
    if (!["feminino", "masculino"].includes(sexValue)) {
      toast.error("Selecione um sexo válido (feminino ou masculino)");
      return;
    }

    const newUsername = editData.username.trim();
    if (!newUsername || newUsername.length < 3) {
      toast.error("Usuário deve ter pelo menos 3 caracteres");
      return;
    }

    setSaving(true);

    // If username changed, update via edge function
    const usernameChanged = profile && newUsername !== profile.username;
    if (usernameChanged) {
      const { data: credRes, error: credErr } = await supabase.functions.invoke("admin-update-credentials", {
        body: { target_user_id: userId, new_username: newUsername },
      });
      if (credErr || credRes?.error) {
        toast.error(credRes?.error || credErr?.message || "Erro ao atualizar usuário");
        setSaving(false);
        return;
      }
    }

    const updateData: any = {
      full_name: editData.full_name.trim(),
      phone: editData.phone.trim(),
      email: editData.email.trim() || null,
      address: editData.address.trim(),
      sex: sexValue,
    };
    if (editData.birth_date) {
      updateData.birth_date = editData.birth_date;
    } else {
      updateData.birth_date = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      console.error("Profile update error:", error);
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados atualizados com sucesso!");
      setEditing(false);
      await loadData();
    }
    setSaving(false);
  };

  const handleMarkUsed = async (couponId: string) => {
    setMarkingUsed(couponId);
    await supabase
      .from("coupons")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", couponId);
    await loadData();
    setMarkingUsed(null);
  };

  const handleDeleteHistory = async () => {
    if (!deletePassword.trim() || !user?.email) return;
    setDeletingHistory(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });
      if (authError) {
        toast.error("Senha incorreta. Tente novamente.");
        setDeletingHistory(false);
        setDeletePassword("");
        return;
      }

      if (deleteTarget === "all") {
        const ids = appointments.map((a) => a.id);
        if (ids.length > 0) {
          const { error } = await supabase.from("appointments").delete().in("id", ids);
          if (error) throw error;
        }
        toast.success("Histórico completo excluído ✅");
      } else if (deleteTarget) {
        const { error } = await supabase.from("appointments").delete().eq("id", deleteTarget);
        if (error) throw error;
        toast.success("Registro excluído ✅");
      }

      await loadData();
    } catch (err: any) {
      console.error("Delete history error:", err);
      toast.error("Erro ao excluir: " + (err.message || "Tente novamente."));
    } finally {
      setDeletingHistory(false);
      setDeleteTarget(null);
      setDeletePassword("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-border shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-heading text-sm font-bold text-primary">{getInitials(userName)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-lg font-bold text-foreground truncate">{editing ? editData.full_name : userName}</h2>
                {profile?.created_at && (
                  <p className="font-body text-xs text-muted-foreground">
                    Cliente desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <Tabs defaultValue="dados" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-5 mt-4 mb-0 shrink-0">
                  <TabsTrigger value="dados" className="text-xs gap-1.5">
                    <User className="w-3.5 h-3.5" /> Dados
                  </TabsTrigger>
                  <TabsTrigger value="anamnese" className="text-xs gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Anamnese
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs gap-1.5">
                    <History className="w-3.5 h-3.5" /> Histórico ({appointments.length})
                  </TabsTrigger>
                  {coupons.length > 0 && (
                    <TabsTrigger value="cupons" className="text-xs gap-1.5">
                      <Ticket className="w-3.5 h-3.5" /> Cupons ({coupons.filter(c => !c.is_used).length})
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-5 pb-10">
                    {/* Dados Pessoais */}
                    <TabsContent value="dados" className="mt-0">
                      {editing ? (
                        <div className="space-y-1">
                          <EditableRow icon={User} label="Nome completo" value={editData.full_name} onChange={(v) => setEditData(d => ({ ...d, full_name: v }))} placeholder="Nome completo" />
                          <EditableRow icon={Phone} label="Telefone" value={editData.phone} onChange={(v) => setEditData(d => ({ ...d, phone: v }))} placeholder="(00) 00000-0000" />
                          <EditableRow icon={Cake} label="Data de Nascimento" value={editData.birth_date} onChange={(v) => setEditData(d => ({ ...d, birth_date: v }))} type="date" />
                          <EditableRow icon={Mail} label="E-mail" value={editData.email} onChange={(v) => setEditData(d => ({ ...d, email: v }))} type="email" placeholder="email@exemplo.com" />
                          <EditableRow icon={MapPin} label="Endereço" value={editData.address} onChange={(v) => setEditData(d => ({ ...d, address: v }))} placeholder="Endereço" />
                          <div className="flex items-start gap-2.5 py-2">
                            <Heart className="w-4 h-4 text-primary mt-2.5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Sexo</p>
                              <select
                                value={editData.sex}
                                onChange={(e) => setEditData(d => ({ ...d, sex: e.target.value }))}
                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Selecione</option>
                                <option value="feminino">Feminino</option>
                                <option value="masculino">Masculino</option>
                              </select>
                            </div>
                          </div>
                          <EditableRow icon={User} label="Usuário (login)" value={editData.username} onChange={(v) => setEditData(d => ({ ...d, username: v.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))} placeholder="nome.usuario" />
                          <InfoRow icon={Calendar} label="Cadastro" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR") : null} />
                          <InfoRow icon={Clock} label="Último acesso" value={profile?.last_seen ? new Date(profile.last_seen).toLocaleString("pt-BR") : "Nunca acessou"} />

                          <div className="flex gap-2 pt-4">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {saving ? (
                                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Salvar
                            </button>
                            <button
                              onClick={() => {
                                setEditing(false);
                                if (profile) {
                                  setEditData({
                                    full_name: profile.full_name || "",
                                    phone: profile.phone || "",
                                    email: profile.email || "",
                                    address: profile.address || "",
                                    sex: (profile.sex || "").toLowerCase(),
                                    birth_date: profile.birth_date || "",
                                    username: profile.username || "",
                                  });
                                }
                              }}
                              className="px-4 py-2.5 rounded-xl border border-border font-body text-sm hover:bg-muted transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <InfoRow icon={User} label="Nome completo" value={profile?.full_name} />
                          <InfoRow icon={Phone} label="Telefone" value={profile?.phone} />
                          <InfoRow icon={Cake} label="Data de Nascimento" value={profile?.birth_date ? new Date(profile.birth_date + "T00:00:00").toLocaleDateString("pt-BR") : null} />
                          <InfoRow icon={Mail} label="E-mail" value={profile?.email} />
                          <InfoRow icon={MapPin} label="Endereço" value={profile?.address} />
                          <InfoRow icon={Heart} label="Sexo" value={profile?.sex} />
                          <InfoRow icon={User} label="Usuário (login)" value={profile?.username} />
                          <InfoRow icon={Calendar} label="Cadastro" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR") : null} />
                          <InfoRow icon={Clock} label="Último acesso" value={profile?.last_seen ? new Date(profile.last_seen).toLocaleString("pt-BR") : "Nunca acessou"} />

                          {!isMasterAdmin && (
                            <button
                              onClick={() => setEditing(true)}
                              className="mt-4 w-full py-2.5 rounded-xl border border-primary/20 text-primary font-body text-sm font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar Dados
                            </button>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* Anamnese */}
                    <TabsContent value="anamnese" className="mt-0">
                      {!anamnesis ? (
                        <div className="text-center py-10">
                          <Stethoscope className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="font-body text-sm text-muted-foreground">Nenhuma ficha de anamnese encontrada.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Queixa & Histórico</h3>
                            <AnamnesisField label="Motivo da consulta" value={anamnesis.motivo_consulta} />
                            <AnamnesisField label="Área tratada" value={anamnesis.area_tratada} />
                            <AnamnesisField label="Tratamentos anteriores" value={anamnesis.tratamentos_anteriores} />
                            <AnamnesisField label="Doenças" value={anamnesis.doencas} />
                            <AnamnesisField label="Cirurgias" value={anamnesis.cirurgias} />
                            <AnamnesisField label="Alergias" value={anamnesis.alergias} />
                            <AnamnesisField label="Medicamentos" value={anamnesis.medicamentos} />
                            <AnamnesisField label="Distúrbios hormonais" value={anamnesis.disturbios_hormonais} />
                            {anamnesis.disturbios_hormonais && <AnamnesisField label="Detalhes hormonais" value={anamnesis.disturbios_hormonais_detalhe} />}
                            <AnamnesisField label="Gestante/Amamentando" value={anamnesis.gestante_amamentando} />
                          </div>
                          <div>
                            <h3 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Hábitos de Vida</h3>
                            <AnamnesisField label="Tabagismo" value={anamnesis.tabagismo} />
                            <AnamnesisField label="Atividade física" value={anamnesis.atividade_fisica} />
                            <AnamnesisField label="Alimentação" value={anamnesis.alimentacao} />
                            <AnamnesisField label="Consumo de água" value={anamnesis.consumo_agua} />
                            <AnamnesisField label="Consumo de álcool" value={anamnesis.consumo_alcool} />
                            <AnamnesisField label="Qualidade do sono" value={anamnesis.qualidade_sono} />
                            <AnamnesisField label="Nível de estresse" value={anamnesis.nivel_estresse} />
                          </div>
                          <div>
                            <h3 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Avaliação Estética</h3>
                            <AnamnesisField label="Tipo de pele" value={anamnesis.tipo_pele} />
                            <AnamnesisField label="Fototipo" value={anamnesis.fototipo} />
                            <AnamnesisField label="Sensibilidade" value={anamnesis.grau_sensibilidade} />
                            <AnamnesisField label="Problemas de pele" value={anamnesis.problemas_pele} />
                            <AnamnesisField label="Condições estéticas" value={anamnesis.condicoes_esteticas} />
                            <AnamnesisField label="Avaliação corporal" value={anamnesis.avaliacao_corporal} />
                          </div>
                          {anamnesis.observacoes && (
                            <div>
                              <h3 className="font-heading text-xs font-bold text-primary uppercase tracking-wider mb-2">Observações</h3>
                              <p className="font-body text-sm text-foreground whitespace-pre-wrap">{anamnesis.observacoes}</p>
                            </div>
                          )}
                          <p className="font-body text-[10px] text-muted-foreground/60 pt-2">
                            Última atualização: {new Date(anamnesis.updated_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Histórico */}
                    <TabsContent value="historico" className="mt-0">
                      {appointments.length === 0 ? (
                        <div className="text-center py-10">
                          <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="font-body text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {appointments.map((a) => {
                            const st = STATUS_MAP[a.status] || { label: a.status, cls: "bg-muted text-muted-foreground" };
                            return (
                              <div key={a.id} className="rounded-xl border border-border p-3 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-heading text-sm font-semibold text-foreground">{a.service_title}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
                                  <span>{formatDate(a.appointment_date)}</span>
                                  <span>{a.appointment_time}</span>
                                  {a.session_number && <span>Sessão {a.session_number}</span>}
                                  {a.partner_name && <span>• {a.partner_name}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Cupons */}
                    <TabsContent value="cupons" className="mt-0">
                      <div className="space-y-2">
                        {coupons.map((c) => {
                          const isPercent = c.discount_type === "percent";
                          const discountLabel = isPercent
                            ? c.discount_value === 100
                              ? "Sessão Gratuita"
                              : `${c.discount_value}% de desconto`
                            : `R$ ${(c.discount_value / 100).toFixed(2).replace(".", ",")} de desconto`;
                          const expired = new Date(c.expires_at) < new Date();

                          return (
                            <div key={c.id} className={`rounded-xl border p-3 space-y-2 ${c.is_used ? "border-border opacity-60" : expired ? "border-destructive/30 opacity-60" : "border-primary/20"}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-heading text-sm font-semibold text-foreground">{discountLabel}</p>
                                  <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.is_used ? "bg-muted text-muted-foreground" : expired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                }`}>
                                  {c.is_used ? "Usado" : expired ? "Expirado" : "Ativo"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
                                <span>Criado: {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                                <span>Expira: {new Date(c.expires_at).toLocaleDateString("pt-BR")}</span>
                              </div>
                              {!c.is_used && !expired && (
                                <button
                                  onClick={() => handleMarkUsed(c.id)}
                                  disabled={markingUsed === c.id}
                                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                  {markingUsed === c.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  Marcar como Usado
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClientDetailModal;
