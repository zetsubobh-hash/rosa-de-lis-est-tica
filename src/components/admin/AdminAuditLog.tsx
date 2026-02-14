import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Shield, LogIn, LogOut, ShoppingBag, CalendarCheck, Users, Settings, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  navigate_tab: "Navegação",
  create_appointment: "Criou Agendamento",
  update_appointment: "Atualizou Agendamento",
  cancel_appointment: "Cancelou Agendamento",
  complete_appointment: "Finalizou Atendimento",
  create_partner: "Criou Parceiro",
  update_partner: "Atualizou Parceiro",
  delete_user: "Excluiu Usuário",
  update_user_credentials: "Alterou Credenciais",
  counter_sale: "Venda Balcão",
  create_plan: "Criou Plano",
  update_plan: "Atualizou Plano",
  update_service: "Atualizou Serviço",
  update_pricing: "Atualizou Preço",
  update_branding: "Atualizou Identidade",
  update_site_settings: "Atualizou Configurações",
  update_payment_settings: "Atualizou Pagamento",
  send_whatsapp_test: "Teste WhatsApp",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  partner: "bg-blue-100 text-blue-800 border-blue-200",
  user: "bg-gray-100 text-gray-800 border-gray-200",
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  login: LogIn,
  logout: LogOut,
  counter_sale: ShoppingBag,
  create_appointment: CalendarCheck,
  update_appointment: CalendarCheck,
  delete_user: Users,
  update_site_settings: Settings,
};

const AdminAuditLog = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [clearing, setClearing] = useState(false);

  const handleClearLogs = async () => {
    setClearing(true);
    const { error } = await (supabase.from("audit_logs" as any).delete() as any).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Erro ao limpar registros");
    } else {
      toast.success("Registros limpos com sucesso");
      setLogs([]);
    }
    setClearing(false);
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = (supabase.from("audit_logs" as any).select("*") as any)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (roleFilter !== "all") query = query.eq("user_role", roleFilter);
    if (actionFilter !== "all") query = query.eq("action", actionFilter);

    const { data } = await query;
    setLogs((data as AuditEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [roleFilter, actionFilter]);

  const filtered = logs.filter((l) =>
    !search || l.user_name.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())
  );

  // Stats - total period
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayLogs = filtered.filter(l => l.created_at.startsWith(todayStr));
  const totalLogins = filtered.filter(l => l.action === "login").length;
  const uniqueUsers = new Set(filtered.map(l => l.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todayLogs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalLogins}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou ação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Perfil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="partner">Parceiro</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2" disabled={clearing || logs.length === 0}>
              <Trash2 className="w-4 h-4" />
              Limpar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todos os registros?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação vai excluir permanentemente todos os {logs.length} registros de auditoria. Essa ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sim, limpar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => {
                const Icon = ACTION_ICONS[log.action] || Shield;
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{log.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ROLE_COLORS[log.user_role] || ""}`}>
                        {log.user_role === "admin" ? "Admin" : log.user_role === "partner" ? "Parceiro" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{ACTION_LABELS[log.action] || log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {log.details && Object.keys(log.details).length > 0
                        ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" | ")
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminAuditLog;
