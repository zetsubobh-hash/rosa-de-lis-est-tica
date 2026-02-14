import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FileText, Save, Printer, ChevronRight, ChevronLeft,
  Droplets, Apple, Dumbbell, Cigarette, Wine, Moon, Brain,
  Heart, Pill, Baby, AlertTriangle, Sun,
  Eye, Sparkles, Shield, CheckCircle2, Circle, Pen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnamnesisModalProps {
  open: boolean;
  onClose: () => void;
  clientUserId: string;
  clientName: string;
  partnerId?: string;
  readOnly?: boolean;
  adminMode?: boolean;
}

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = [
  "Queixa Principal",
  "Histórico de Saúde",
  "Hábitos de Vida",
  "Avaliação Estética",
  "Termos Legais",
];

const DOENCAS_OPTIONS = [
  "Diabetes", "Hipertensão", "Cardiopatia", "Tireoide", "Epilepsia", "Câncer", "Asma",
];
const ALERGIAS_OPTIONS = ["Medicamentos", "Cosméticos", "Alimentos", "Látex", "Metais"];
const PROBLEMAS_PELE_OPTIONS = ["Acne", "Manchas", "Melasma", "Rosácea", "Dermatite", "Psoríase", "Vitiligo"];
const CONDICOES_ESTETICAS_OPTIONS = [
  "Acne", "Manchas", "Flacidez", "Rugas", "Estrias", "Gordura localizada", "Celulite", "Olheiras",
];
const TIPO_PELE_OPTIONS = ["Seca", "Oleosa", "Mista", "Normal", "Sensível"];
const FOTOTIPO_OPTIONS = ["I - Muito clara", "II - Clara", "III - Morena clara", "IV - Morena", "V - Morena escura", "VI - Negra"];
const SENSIBILIDADE_OPTIONS = ["Baixa", "Moderada", "Alta"];
const AGUA_OPTIONS = ["Menos de 1L", "1-2L", "2-3L", "Mais de 3L"];
const ALIMENTACAO_OPTIONS = ["Equilibrada", "Rica em carboidratos", "Rica em proteínas", "Fast food frequente", "Vegetariana/Vegana"];
const ATIVIDADE_OPTIONS = ["Sedentário", "1-2x/semana", "3-4x/semana", "5+x/semana"];
const ALCOOL_OPTIONS = ["Nunca", "Social", "Moderado", "Frequente"];
const SONO_OPTIONS = ["Bom", "Regular", "Ruim", "Insônia"];
const ESTRESSE_OPTIONS = ["Baixo", "Moderado", "Alto", "Muito alto"];
const GESTANTE_OPTIONS = [
  { value: "nao", label: "Não" },
  { value: "gestante", label: "Gestante" },
  { value: "amamentando", label: "Amamentando" },
];
const TEMPO_QUEIXA_OPTIONS = ["Menos de 1 mês", "1-6 meses", "6-12 meses", "1-3 anos", "Mais de 3 anos"];

interface FormData {
  motivo_consulta: string;
  area_tratada: string;
  tempo_queixa: string;
  tratamentos_anteriores: string;
  doencas: string[];
  doencas_outras: string;
  cirurgias: string;
  alergias: string[];
  alergias_outras: string;
  medicamentos: string;
  disturbios_hormonais: boolean;
  disturbios_hormonais_detalhe: string;
  problemas_pele: string[];
  problemas_pele_outros: string;
  gestante_amamentando: string;
  consumo_agua: string;
  alimentacao: string;
  atividade_fisica: string;
  tabagismo: string;
  consumo_alcool: string;
  qualidade_sono: string;
  nivel_estresse: string;
  tipo_pele: string;
  fototipo: string;
  condicoes_esteticas: string[];
  condicoes_esteticas_outras: string;
  grau_sensibilidade: string;
  avaliacao_corporal: string;
  consentimento_informado: boolean;
  autorizacao_imagem: boolean;
  assinatura_cliente: string;
  assinatura_profissional: string;
  data_assinatura: string;
  observacoes: string;
}

const defaultForm: FormData = {
  motivo_consulta: "", area_tratada: "", tempo_queixa: "", tratamentos_anteriores: "",
  doencas: [], doencas_outras: "", cirurgias: "", alergias: [], alergias_outras: "",
  medicamentos: "", disturbios_hormonais: false, disturbios_hormonais_detalhe: "",
  problemas_pele: [], problemas_pele_outros: "", gestante_amamentando: "nao",
  consumo_agua: "", alimentacao: "", atividade_fisica: "", tabagismo: "nao",
  consumo_alcool: "", qualidade_sono: "", nivel_estresse: "",
  tipo_pele: "", fototipo: "", condicoes_esteticas: [], condicoes_esteticas_outras: "",
  grau_sensibilidade: "", avaliacao_corporal: "",
  consentimento_informado: false, autorizacao_imagem: false,
  assinatura_cliente: "", assinatura_profissional: "",
  data_assinatura: new Date().toISOString().split("T")[0],
  observacoes: "",
};

const IconChip = ({
  label, selected, onClick, icon: Icon, disabled,
}: { label: string; selected: boolean; onClick: () => void; icon?: any; disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
      selected
        ? "bg-primary text-primary-foreground border-primary shadow-sm"
        : "bg-card text-foreground border-border hover:border-primary/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {label}
  </button>
);

const ToggleChip = ({
  label, selected, onClick, disabled,
}: { label: string; selected: boolean; onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-foreground border-border hover:border-primary/50"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
    {label}
  </button>
);

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className="w-4 h-4 text-primary" />
    <h4 className="font-heading text-sm font-bold text-foreground">{title}</h4>
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="font-body text-xs text-muted-foreground mb-1.5 font-medium">{children}</p>
);

const AnamnesisModal = ({ open, onClose, clientUserId, clientName, partnerId, readOnly = false, adminMode = false }: AnamnesisModalProps) => {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [consultMode, setConsultMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setConsultMode(false);
    loadExisting();
  }, [open, clientUserId, partnerId]);

  const loadExisting = async () => {
    setLoading(true);
    let query = supabase
      .from("anamnesis" as any)
      .select("*")
      .eq("user_id", clientUserId);
    
    if (!adminMode && partnerId) {
      query = query.eq("partner_id", partnerId);
    }

    const { data } = adminMode
      ? await query.order("updated_at", { ascending: false }).limit(1).maybeSingle()
      : await query.maybeSingle();

    if (data) {
      setExistingId((data as any).id);
      const d = data as any;
      setForm({
        motivo_consulta: d.motivo_consulta || "",
        area_tratada: d.area_tratada || "",
        tempo_queixa: d.tempo_queixa || "",
        tratamentos_anteriores: d.tratamentos_anteriores || "",
        doencas: d.doencas || [],
        doencas_outras: d.doencas_outras || "",
        cirurgias: d.cirurgias || "",
        alergias: d.alergias || [],
        alergias_outras: d.alergias_outras || "",
        medicamentos: d.medicamentos || "",
        disturbios_hormonais: d.disturbios_hormonais || false,
        disturbios_hormonais_detalhe: d.disturbios_hormonais_detalhe || "",
        problemas_pele: d.problemas_pele || [],
        problemas_pele_outros: d.problemas_pele_outros || "",
        gestante_amamentando: d.gestante_amamentando || "nao",
        consumo_agua: d.consumo_agua || "",
        alimentacao: d.alimentacao || "",
        atividade_fisica: d.atividade_fisica || "",
        tabagismo: d.tabagismo || "nao",
        consumo_alcool: d.consumo_alcool || "",
        qualidade_sono: d.qualidade_sono || "",
        nivel_estresse: d.nivel_estresse || "",
        tipo_pele: d.tipo_pele || "",
        fototipo: d.fototipo || "",
        condicoes_esteticas: d.condicoes_esteticas || [],
        condicoes_esteticas_outras: d.condicoes_esteticas_outras || "",
        grau_sensibilidade: d.grau_sensibilidade || "",
        avaliacao_corporal: d.avaliacao_corporal || "",
        consentimento_informado: d.consentimento_informado || false,
        autorizacao_imagem: d.autorizacao_imagem || false,
        assinatura_cliente: d.assinatura_cliente || "",
        assinatura_profissional: d.assinatura_profissional || "",
        data_assinatura: d.data_assinatura || new Date().toISOString().split("T")[0],
        observacoes: d.observacoes || "",
      });
      setConsultMode(true);
    } else {
      setExistingId(null);
      setConsultMode(false);
      setForm({ ...defaultForm });
    }
    setLoading(false);
  };

  const toggleArray = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const save = async () => {
    setSaving(true);
    const payload = { ...form, user_id: clientUserId, ...(partnerId ? { partner_id: partnerId } : {}) };

    let error;
    if (existingId) {
      const res = await supabase.from("anamnesis" as any).update(payload as any).eq("id", existingId);
      error = res.error;
    } else {
      const res = await supabase.from("anamnesis" as any).insert(payload as any);
      error = res.error;
      if (!error) {
        const { data: newData } = await supabase.from("anamnesis" as any).select("id").eq("user_id", clientUserId).eq("partner_id", partnerId).maybeSingle();
        if (newData) setExistingId((newData as any).id);
      }
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar ficha: " + error.message);
    } else {
      toast.success("Ficha de anamnese salva com sucesso!");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("anamnesis-print-area");
    if (!printContent) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Ficha de Anamnese - ${clientName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { font-size: 20px; border-bottom: 2px solid #d4a0b0; padding-bottom: 8px; }
        h2 { font-size: 16px; margin-top: 24px; color: #a0506a; }
        .field { margin: 8px 0; } .label { font-weight: bold; } .value { margin-left: 4px; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .chip { background: #f5e6ec; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
        .signature-line { border-bottom: 1px solid #333; width: 300px; display: inline-block; margin-top: 40px; padding-bottom: 4px; }
        .sig-section { display: flex; justify-content: space-between; margin-top: 60px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  if (!open) return null;

  // eslint-disable-next-line no-var
  const effectiveReadOnly = readOnly || consultMode;

  const renderStep0 = () => (
    <div className="space-y-4">
      <SectionTitle icon={FileText} title="Queixa Principal" />
      <div>
        <FieldLabel>Motivo da consulta</FieldLabel>
        <textarea disabled={effectiveReadOnly} value={form.motivo_consulta} onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground resize-none focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" rows={2} placeholder="Descreva o motivo..." />
      </div>
      <div>
        <FieldLabel>Área a ser tratada</FieldLabel>
        <textarea disabled={effectiveReadOnly} value={form.area_tratada} onChange={(e) => setForm({ ...form, area_tratada: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground resize-none focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" rows={2} placeholder="Ex: Face, abdômen..." />
      </div>
      <div>
        <FieldLabel>Há quanto tempo existe a queixa</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {TEMPO_QUEIXA_OPTIONS.map((opt) => (
            <IconChip key={opt} label={opt} selected={form.tempo_queixa === opt} onClick={() => !effectiveReadOnly && setForm({ ...form, tempo_queixa: opt })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Tratamentos anteriores realizados</FieldLabel>
        <textarea disabled={effectiveReadOnly} value={form.tratamentos_anteriores} onChange={(e) => setForm({ ...form, tratamentos_anteriores: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground resize-none focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" rows={2} placeholder="Descreva tratamentos anteriores..." />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <SectionTitle icon={Heart} title="Histórico de Saúde" />
      <div>
        <FieldLabel>Doenças atuais ou prévias</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DOENCAS_OPTIONS.map((d) => (
            <ToggleChip key={d} label={d} selected={form.doencas.includes(d)} onClick={() => !effectiveReadOnly && setForm({ ...form, doencas: toggleArray(form.doencas, d) })} disabled={effectiveReadOnly} />
          ))}
        </div>
        <input disabled={effectiveReadOnly} value={form.doencas_outras} onChange={(e) => setForm({ ...form, doencas_outras: e.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Outras doenças..." />
      </div>
      <div>
        <FieldLabel>Cirurgias realizadas</FieldLabel>
        <input disabled={effectiveReadOnly} value={form.cirurgias} onChange={(e) => setForm({ ...form, cirurgias: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Descreva cirurgias..." />
      </div>
      <div>
        <FieldLabel>Alergias</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ALERGIAS_OPTIONS.map((a) => (
            <ToggleChip key={a} label={a} selected={form.alergias.includes(a)} onClick={() => !effectiveReadOnly && setForm({ ...form, alergias: toggleArray(form.alergias, a) })} disabled={effectiveReadOnly} />
          ))}
        </div>
        <input disabled={effectiveReadOnly} value={form.alergias_outras} onChange={(e) => setForm({ ...form, alergias_outras: e.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Outras alergias..." />
      </div>
      <div>
        <FieldLabel>Medicamentos contínuos</FieldLabel>
        <input disabled={effectiveReadOnly} value={form.medicamentos} onChange={(e) => setForm({ ...form, medicamentos: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Liste os medicamentos..." />
      </div>
      <div>
        <FieldLabel>Distúrbios hormonais</FieldLabel>
        <div className="flex gap-2">
          <IconChip label="Sim" icon={AlertTriangle} selected={form.disturbios_hormonais} onClick={() => !effectiveReadOnly && setForm({ ...form, disturbios_hormonais: true })} disabled={effectiveReadOnly} />
          <IconChip label="Não" icon={Shield} selected={!form.disturbios_hormonais} onClick={() => !effectiveReadOnly && setForm({ ...form, disturbios_hormonais: false })} disabled={effectiveReadOnly} />
        </div>
        {form.disturbios_hormonais && (
          <input disabled={effectiveReadOnly} value={form.disturbios_hormonais_detalhe} onChange={(e) => setForm({ ...form, disturbios_hormonais_detalhe: e.target.value })}
            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Quais distúrbios..." />
        )}
      </div>
      <div>
        <FieldLabel>Problemas de pele diagnosticados</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {PROBLEMAS_PELE_OPTIONS.map((p) => (
            <ToggleChip key={p} label={p} selected={form.problemas_pele.includes(p)} onClick={() => !effectiveReadOnly && setForm({ ...form, problemas_pele: toggleArray(form.problemas_pele, p) })} disabled={effectiveReadOnly} />
          ))}
        </div>
        <input disabled={effectiveReadOnly} value={form.problemas_pele_outros} onChange={(e) => setForm({ ...form, problemas_pele_outros: e.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Outros problemas..." />
      </div>
      <div>
        <FieldLabel>Gestação ou amamentação</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {GESTANTE_OPTIONS.map((g) => (
            <IconChip key={g.value} label={g.label} icon={g.value === "nao" ? Shield : Baby} selected={form.gestante_amamentando === g.value} onClick={() => !effectiveReadOnly && setForm({ ...form, gestante_amamentando: g.value })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <SectionTitle icon={Dumbbell} title="Hábitos de Vida" />
      <div>
        <FieldLabel>Consumo de água</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {AGUA_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Droplets} selected={form.consumo_agua === o} onClick={() => !effectiveReadOnly && setForm({ ...form, consumo_agua: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Alimentação</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ALIMENTACAO_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Apple} selected={form.alimentacao === o} onClick={() => !effectiveReadOnly && setForm({ ...form, alimentacao: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Prática de atividade física</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ATIVIDADE_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Dumbbell} selected={form.atividade_fisica === o} onClick={() => !effectiveReadOnly && setForm({ ...form, atividade_fisica: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Tabagismo</FieldLabel>
        <div className="flex gap-2">
          <IconChip label="Não" icon={Shield} selected={form.tabagismo === "nao"} onClick={() => !effectiveReadOnly && setForm({ ...form, tabagismo: "nao" })} disabled={effectiveReadOnly} />
          <IconChip label="Sim" icon={Cigarette} selected={form.tabagismo === "sim"} onClick={() => !effectiveReadOnly && setForm({ ...form, tabagismo: "sim" })} disabled={effectiveReadOnly} />
          <IconChip label="Ex-fumante" icon={Cigarette} selected={form.tabagismo === "ex"} onClick={() => !effectiveReadOnly && setForm({ ...form, tabagismo: "ex" })} disabled={effectiveReadOnly} />
        </div>
      </div>
      <div>
        <FieldLabel>Consumo de álcool</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ALCOOL_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Wine} selected={form.consumo_alcool === o} onClick={() => !effectiveReadOnly && setForm({ ...form, consumo_alcool: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Qualidade do sono</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SONO_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Moon} selected={form.qualidade_sono === o} onClick={() => !effectiveReadOnly && setForm({ ...form, qualidade_sono: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Nível de estresse</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ESTRESSE_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Brain} selected={form.nivel_estresse === o} onClick={() => !effectiveReadOnly && setForm({ ...form, nivel_estresse: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <SectionTitle icon={Eye} title="Avaliação Estética" />
      <div>
        <FieldLabel>Tipo de pele</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {TIPO_PELE_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Sparkles} selected={form.tipo_pele === o} onClick={() => !effectiveReadOnly && setForm({ ...form, tipo_pele: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Fototipo (Escala de Fitzpatrick)</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {FOTOTIPO_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Sun} selected={form.fototipo === o} onClick={() => !effectiveReadOnly && setForm({ ...form, fototipo: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Condições estéticas presentes</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CONDICOES_ESTETICAS_OPTIONS.map((c) => (
            <ToggleChip key={c} label={c} selected={form.condicoes_esteticas.includes(c)} onClick={() => !effectiveReadOnly && setForm({ ...form, condicoes_esteticas: toggleArray(form.condicoes_esteticas, c) })} disabled={effectiveReadOnly} />
          ))}
        </div>
        <input disabled={effectiveReadOnly} value={form.condicoes_esteticas_outras} onChange={(e) => setForm({ ...form, condicoes_esteticas_outras: e.target.value })}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Outras condições..." />
      </div>
      <div>
        <FieldLabel>Grau de sensibilidade</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SENSIBILIDADE_OPTIONS.map((o) => (
            <IconChip key={o} label={o} icon={Shield} selected={form.grau_sensibilidade === o} onClick={() => !effectiveReadOnly && setForm({ ...form, grau_sensibilidade: o })} disabled={effectiveReadOnly} />
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Avaliação corporal (medidas, IMC, adiposidade)</FieldLabel>
        <textarea disabled={effectiveReadOnly} value={form.avaliacao_corporal} onChange={(e) => setForm({ ...form, avaliacao_corporal: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground resize-none focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" rows={3} placeholder="Descreva medidas, IMC..." />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <SectionTitle icon={Pen} title="Termos Legais" />
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <div>
          <p className="font-body text-xs text-foreground leading-relaxed">
            Declaro que as informações prestadas nesta ficha são verdadeiras e completas. Autorizo o(a) profissional a realizar os procedimentos estéticos indicados conforme avaliação técnica, estando ciente dos possíveis riscos, benefícios e contraindicações envolvidos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ToggleChip label="Consentimento informado" selected={form.consentimento_informado}
            onClick={() => !effectiveReadOnly && setForm({ ...form, consentimento_informado: !form.consentimento_informado })} disabled={effectiveReadOnly} />
          <ToggleChip label="Autorização para uso de imagem" selected={form.autorizacao_imagem}
            onClick={() => !effectiveReadOnly && setForm({ ...form, autorizacao_imagem: !form.autorizacao_imagem })} disabled={effectiveReadOnly} />
        </div>
      </div>
      <div>
        <FieldLabel>Assinatura do cliente (nome completo)</FieldLabel>
        <input disabled={effectiveReadOnly} value={form.assinatura_cliente} onChange={(e) => setForm({ ...form, assinatura_cliente: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Nome completo do cliente" />
      </div>
      <div>
        <FieldLabel>Assinatura da profissional (nome completo)</FieldLabel>
        <input disabled={effectiveReadOnly} value={form.assinatura_profissional} onChange={(e) => setForm({ ...form, assinatura_profissional: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" placeholder="Nome completo da profissional" />
      </div>
      <div>
        <FieldLabel>Data</FieldLabel>
        <input type="date" disabled={effectiveReadOnly} value={form.data_assinatura} onChange={(e) => setForm({ ...form, data_assinatura: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-50" />
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <FieldLabel>📝 Observações da profissional</FieldLabel>
        <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-body text-foreground resize-none focus:ring-2 focus:ring-primary focus:outline-none" rows={4} placeholder="Anotações, observações sobre o cliente..." />
        <p className="font-body text-[10px] text-muted-foreground mt-1">Este campo pode ser editado a qualquer momento.</p>
      </div>
    </div>
  );

  const formatDateBR = (d: string) => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };

  

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {consultMode ? "Consultar Anamnese" : "Ficha de Anamnese"}
                </h3>
                <p className="font-body text-xs text-muted-foreground mt-0.5">{clientName}</p>
              </div>
              <div className="flex items-center gap-2">
                {existingId && !readOnly && (
                  <button
                    onClick={() => setConsultMode(!consultMode)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors border ${
                      consultMode
                        ? "border-primary/20 text-primary hover:bg-primary/10"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                    title={consultMode ? "Editar ficha" : "Modo consulta"}
                  >
                    <Pen className="w-3.5 h-3.5" />
                    {consultMode ? "Editar" : "Consultar"}
                  </button>
                )}
                {existingId && (
                  <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Imprimir">
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-border shrink-0 overflow-x-auto">
              {STEP_LABELS.map((label, i) => (
                <button key={i} onClick={() => setStep(i as Step)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                    step === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}>
                  <span className="font-bold">{i + 1}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {step === 0 && renderStep0()}
                  {step === 1 && renderStep1()}
                  {step === 2 && renderStep2()}
                  {step === 3 && renderStep3()}
                  {step === 4 && renderStep4()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
                disabled={step === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <button onClick={save} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Salvando..." : consultMode ? "Salvar Obs." : "Salvar"}
                  </button>
                )}
                {step < 4 && (
                  <button
                    onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Hidden print area */}
          <div id="anamnesis-print-area" className="hidden">
            <h1>Ficha de Anamnese — {clientName}</h1>
            <h2>1. Queixa Principal</h2>
            <div className="field"><span className="label">Motivo:</span><span className="value">{form.motivo_consulta || "—"}</span></div>
            <div className="field"><span className="label">Área:</span><span className="value">{form.area_tratada || "—"}</span></div>
            <div className="field"><span className="label">Tempo da queixa:</span><span className="value">{form.tempo_queixa || "—"}</span></div>
            <div className="field"><span className="label">Tratamentos anteriores:</span><span className="value">{form.tratamentos_anteriores || "—"}</span></div>
            <h2>2. Histórico de Saúde</h2>
            <div className="field"><span className="label">Doenças:</span><div className="chips">{form.doencas.map((d) => `<span class="chip">${d}</span>`).join("")}{form.doencas_outras ? `<span class="chip">${form.doencas_outras}</span>` : ""}</div></div>
            <div className="field"><span className="label">Cirurgias:</span><span className="value">{form.cirurgias || "—"}</span></div>
            <div className="field"><span className="label">Alergias:</span><div className="chips">{form.alergias.map((a) => `<span class="chip">${a}</span>`).join("")}{form.alergias_outras ? `<span class="chip">${form.alergias_outras}</span>` : ""}</div></div>
            <div className="field"><span className="label">Medicamentos:</span><span className="value">{form.medicamentos || "—"}</span></div>
            <div className="field"><span className="label">Distúrbios hormonais:</span><span className="value">{form.disturbios_hormonais ? `Sim — ${form.disturbios_hormonais_detalhe}` : "Não"}</span></div>
            <div className="field"><span className="label">Problemas de pele:</span><div className="chips">{form.problemas_pele.map((p) => `<span class="chip">${p}</span>`).join("")}{form.problemas_pele_outros ? `<span class="chip">${form.problemas_pele_outros}</span>` : ""}</div></div>
            <div className="field"><span className="label">Gestante/Amamentando:</span><span className="value">{form.gestante_amamentando === "nao" ? "Não" : form.gestante_amamentando === "gestante" ? "Gestante" : "Amamentando"}</span></div>
            <h2>3. Hábitos de Vida</h2>
            <div className="field"><span className="label">Água:</span><span className="value">{form.consumo_agua || "—"}</span></div>
            <div className="field"><span className="label">Alimentação:</span><span className="value">{form.alimentacao || "—"}</span></div>
            <div className="field"><span className="label">Atividade física:</span><span className="value">{form.atividade_fisica || "—"}</span></div>
            <div className="field"><span className="label">Tabagismo:</span><span className="value">{form.tabagismo === "nao" ? "Não" : form.tabagismo === "sim" ? "Sim" : "Ex-fumante"}</span></div>
            <div className="field"><span className="label">Álcool:</span><span className="value">{form.consumo_alcool || "—"}</span></div>
            <div className="field"><span className="label">Sono:</span><span className="value">{form.qualidade_sono || "—"}</span></div>
            <div className="field"><span className="label">Estresse:</span><span className="value">{form.nivel_estresse || "—"}</span></div>
            <h2>4. Avaliação Estética</h2>
            <div className="field"><span className="label">Tipo de pele:</span><span className="value">{form.tipo_pele || "—"}</span></div>
            <div className="field"><span className="label">Fototipo:</span><span className="value">{form.fototipo || "—"}</span></div>
            <div className="field"><span className="label">Condições:</span><div className="chips">{form.condicoes_esteticas.map((c) => `<span class="chip">${c}</span>`).join("")}{form.condicoes_esteticas_outras ? `<span class="chip">${form.condicoes_esteticas_outras}</span>` : ""}</div></div>
            <div className="field"><span className="label">Sensibilidade:</span><span className="value">{form.grau_sensibilidade || "—"}</span></div>
            <div className="field"><span className="label">Avaliação corporal:</span><span className="value">{form.avaliacao_corporal || "—"}</span></div>
            <h2>5. Termos Legais</h2>
            <div className="field"><span className="label">Consentimento informado:</span><span className="value">{form.consentimento_informado ? "✓ Sim" : "✗ Não"}</span></div>
            <div className="field"><span className="label">Autorização de imagem:</span><span className="value">{form.autorizacao_imagem ? "✓ Sim" : "✗ Não"}</span></div>
            <div className="sig-section">
              <div><span className="signature-line">{form.assinatura_cliente}</span><br/><small>Assinatura do Cliente</small></div>
              <div><span className="signature-line">{form.assinatura_profissional}</span><br/><small>Assinatura da Profissional</small></div>
            </div>
            <p style={{marginTop: "20px"}}>Data: {form.data_assinatura ? formatDateBR(form.data_assinatura) : "—"}</p>
            {form.observacoes && (
              <>
                <h2>6. Observações</h2>
                <div className="field"><span className="value">{form.observacoes}</span></div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnamnesisModal;
