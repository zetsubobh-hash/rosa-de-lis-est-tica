import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, Plus, Search, CheckCircle2, MinusCircle, PlusCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientPlan {
  id: string;
  user_id: string;
  service_slug: string;
  service_title: string;
  plan_name: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
  created_by: string;
  created_at: string;
  notes: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface ServiceOption {
  slug: string;
  title: string;
}

const AdminClientPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<ClientPlan[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Create form state
  const [newUserId, setNewUserId] = useState("");
  const [newServiceSlug, setNewServiceSlug] = useState("");
  const [newPlanName, setNewPlanName] = useState("Essencial");
  const [newTotalSessions, setNewTotalSessions] = useState(5);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, profilesRes, servicesRes] = await Promise.all([
      supabase.from("client_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name").order("full_name"),
      supabase.from("services").select("slug, title").eq("is_active", true).order("sort_order"),
    ]);
    setPlans((plansRes.data as ClientPlan[]) || []);
    setProfiles((profilesRes.data as Profile[]) || []);
    setServices((servicesRes.data as ServiceOption[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getClientName = (userId: string) =>
    profiles.find((p) => p.user_id === userId)?.full_name || "Desconhecido";

  const updateSessions = async (planId: string, delta: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const newCompleted = Math.max(0, Math.min(plan.total_sessions, plan.completed_sessions + delta));
    const newStatus = newCompleted >= plan.total_sessions ? "completed" : "active";

    setUpdating(planId);
    const { error } = await supabase
      .from("client_plans")
      .update({ completed_sessions: newCompleted, status: newStatus })
      .eq("id", planId);

    if (error) {
      toast({ title: "Erro ao atualizar sessões", variant: "destructive" });
    } else {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId ? { ...p, completed_sessions: newCompleted, status: newStatus } : p
        )
      );
      toast({ title: newCompleted >= plan.total_sessions ? "Plano concluído! ✅" : "Sessão atualizada ✅" });
    }
    setUpdating(null);
  };

  const handleCreate = async () => {
    if (!newUserId || !newServiceSlug) {
      toast({ title: "Selecione cliente e serviço", variant: "destructive" });
      return;
    }
    setCreating(true);
    const service = services.find((s) => s.slug === newServiceSlug);
    const { error } = await supabase.from("client_plans").insert({
      user_id: newUserId,
      service_slug: newServiceSlug,
      service_title: service?.title || newServiceSlug,
      plan_name: newPlanName,
      total_sessions: newTotalSessions,
      completed_sessions: 0,
      status: "active",
      created_by: "admin",
    });
    if (error) {
      toast({ title: "Erro ao criar plano", variant: "destructive" });
    } else {
      toast({ title: "Plano criado com sucesso ✅" });
      setShowCreate(false);
      setNewUserId("");
      setNewServiceSlug("");
      setNewPlanName("Essencial");
      setNewTotalSessions(5);
      fetchData();
    }
    setCreating(false);
  };

  const filtered = plans.filter((p) => {
    const name = getClientName(p.user_id).toLowerCase();
    return name.includes(search.toLowerCase()) || p.service_title.toLowerCase().includes(search.toLowerCase());
  });

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
          Planos de Clientes ({plans.length})
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-body w-52"
              placeholder="Buscar cliente ou serviço..."
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-body text-xs font-bold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum plano encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((plan, idx) => {
            const progress = plan.total_sessions > 0 ? (plan.completed_sessions / plan.total_sessions) * 100 : 0;
            const isComplete = plan.completed_sessions >= plan.total_sessions;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-heading text-sm font-bold text-foreground truncate">
                        {getClientName(plan.user_id)}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isComplete ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold"
                      }`}>
                        {isComplete ? "Completo" : "Ativo"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                        {plan.created_by === "auto" ? "Auto" : "Manual"}
                      </span>
                    </div>
                    <p className="font-body text-xs text-muted-foreground mb-2">
                      {plan.service_title} • {plan.plan_name}
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="font-heading text-xs font-bold text-foreground shrink-0">
                        {plan.completed_sessions}/{plan.total_sessions}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <button
                      onClick={() => updateSessions(plan.id, -1)}
                      disabled={updating === plan.id || plan.completed_sessions === 0}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/20 transition-all disabled:opacity-30"
                      title="Remover sessão"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateSessions(plan.id, 1)}
                      disabled={updating === plan.id || isComplete}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all disabled:opacity-30"
                      title="Marcar sessão realizada"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Criar Plano Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">Cliente</label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">Serviço</label>
              <Select value={newServiceSlug} onValueChange={setNewServiceSlug}>
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">Nome do Plano</label>
              <Input
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="font-body text-sm"
                placeholder="Ex: Premium"
              />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">Total de Sessões</label>
              <Input
                type="number"
                min={1}
                value={newTotalSessions}
                onChange={(e) => setNewTotalSessions(parseInt(e.target.value) || 1)}
                className="font-body text-sm"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-body text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4" />
              {creating ? "Criando..." : "Criar Plano"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminClientPlans;
