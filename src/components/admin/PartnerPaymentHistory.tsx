import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Calendar as CalendarIcon, DollarSign, FileText, ChevronLeft, ChevronRight, Trash2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PartnerPayment {
  id: string;
  type: string;
  description: string;
  amount_cents: number;
  reference_month: string;
  paid_at: string;
}

interface Props {
  partnerId: string;
  partnerName: string;
  salaryCents: number;
  commissionCents: number;
  sessions: number;
  onClose: () => void;
}

const TYPES = [
  { key: "salary", label: "Salário" },
  { key: "advance", label: "Adiantamento" },
  { key: "bonus", label: "Bônus" },
  { key: "deduction", label: "Desconto" },
  { key: "other", label: "Outro" },
];

const formatCurrency = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PartnerPaymentHistory = ({ partnerId, partnerName, salaryCents, commissionCents, sessions, onClose }: Props) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState("salary");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState<Date>(new Date());

  const fetchPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_payments")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("reference_month", month)
      .order("paid_at", { ascending: false });
    setPayments((data as PartnerPayment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [month, partnerId]);

  const handleAdd = async () => {
    const amountDigits = newAmount.replace(/\D/g, "");
    const amountCents = amountDigits ? parseInt(amountDigits, 10) : 0;
    if (!amountCents) return;
    setSaving(true);

    const { error } = await supabase.from("partner_payments").insert({
      partner_id: partnerId,
      type: newType,
      description: newDesc || TYPES.find((t) => t.key === newType)?.label || "",
      amount_cents: amountCents,
      reference_month: month,
      paid_at: newDate.toISOString(),
    });

    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrado ✅" });
      setShowAdd(false);
      setNewType("salary");
      setNewDesc("");
      setNewAmount("");
      setNewDate(new Date());
      fetchPayments();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("partner_payments").delete().eq("id", id);
    fetchPayments();
  };

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1);
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  const totalPaid = payments.reduce((sum, p) => sum + (p.type === "deduction" ? -p.amount_cents : p.amount_cents), 0);
  const expectedTotal = salaryCents + commissionCents;
  const balance = expectedTotal - totalPaid;

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    if (!digits) { setNewAmount(""); return; }
    const cents = parseInt(digits, 10);
    setNewAmount((cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg my-8 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">Histórico Financeiro</h3>
            <p className="font-body text-xs text-muted-foreground mt-0.5">{partnerName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Month selector */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-border">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="font-heading text-sm font-semibold text-foreground capitalize">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Salário</p>
            <p className="font-heading text-xs font-bold text-foreground">{formatCurrency(salaryCents)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Comissões</p>
            <p className="font-heading text-xs font-bold text-primary">{formatCurrency(commissionCents)}</p>
            <p className="font-body text-[9px] text-muted-foreground">{sessions} sessões</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Pago</p>
            <p className="font-heading text-xs font-bold text-foreground">{formatCurrency(totalPaid)}</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${balance > 0 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
            <p className="font-body text-[9px] text-muted-foreground uppercase tracking-wider">Saldo</p>
            <p className={`font-heading text-xs font-bold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatCurrency(Math.abs(balance))}
            </p>
            <p className="font-body text-[9px] text-muted-foreground">{balance > 0 ? "a pagar" : balance < 0 ? "excedente" : "quitado"}</p>
          </div>
        </div>

        {/* Payment list */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lançamentos</p>
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3" /> Novo
            </Button>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
            </div>
          ) : payments.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="font-body text-xs text-muted-foreground">Nenhum lançamento neste mês.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    p.type === "deduction" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  }`}>
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-xs font-medium text-foreground truncate">
                      {p.description || TYPES.find((t) => t.key === p.type)?.label}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      {new Date(p.paid_at).toLocaleDateString("pt-BR")}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-muted font-medium">
                        {TYPES.find((t) => t.key === p.type)?.label}
                      </span>
                    </p>
                  </div>
                  <p className={`font-heading text-sm font-bold shrink-0 ${p.type === "deduction" ? "text-destructive" : "text-foreground"}`}>
                    {p.type === "deduction" ? "−" : "+"}{formatCurrency(p.amount_cents)}
                  </p>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add payment form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Tipo</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-card px-3 font-body text-sm text-foreground"
                    >
                      {TYPES.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Valor (R$)</label>
                    <Input
                      value={newAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0,00"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full h-9 justify-start text-left font-normal text-sm", !newDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {newDate ? format(newDate, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[80]" align="start">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={(d) => d && setNewDate(d)}
                          locale={ptBR}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="font-body text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Descrição</label>
                    <Input
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Ex: Adiantamento..."
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancelar</Button>
                  <Button size="sm" onClick={handleAdd} disabled={saving} className="flex-1 gap-1">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default PartnerPaymentHistory;
