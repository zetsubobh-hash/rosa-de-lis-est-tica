import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldOff, Search, Users, Crown, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import AnamnesisModal from "@/components/AnamnesisModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MASTER_ADMIN_ID = "4649913b-f48b-470e-b407-251803756157";

interface UserProfile {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  isAdmin: boolean;
}

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const isOnline = (lastSeen: string | null) => {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
};

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [anamnesisUser, setAnamnesisUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, email, avatar_url, last_seen")
      .order("full_name");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");

    const { data: partners } = await supabase
      .from("partners")
      .select("user_id, avatar_url");

    const adminIds = new Set(roles?.map((r: any) => r.user_id) || []);
    const partnerAvatars = new Map(
      (partners || []).filter((p: any) => p.avatar_url).map((p: any) => [p.user_id, p.avatar_url])
    );

    setUsers(
      (profiles || []).map((p: any) => ({
        ...p,
        avatar_url: p.avatar_url || partnerAvatars.get(p.user_id) || null,
        isAdmin: adminIds.has(p.user_id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async () => {
    if (!userToDelete || userToDelete.user_id === MASTER_ADMIN_ID) return;
    setDeleting(userToDelete.user_id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `https://sxzmtnsfsyifujdnqyzr.supabase.co/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ user_id: userToDelete.user_id }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast({ title: result.error || "Erro ao excluir", variant: "destructive" });
      } else {
        toast({ title: "Usuário excluído com sucesso ✅" });
        setUsers((prev) => prev.filter((u) => u.user_id !== userToDelete.user_id));
      }
    } catch {
      toast({ title: "Erro ao excluir usuário", variant: "destructive" });
    }
    setDeleting(null);
    setUserToDelete(null);
  };

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === MASTER_ADMIN_ID) {
      toast({ title: "O Admin Master não pode ser alterado", variant: "destructive" });
      return;
    }
    setToggling(userId);
    if (currentlyAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) {
        toast({ title: "Erro ao remover admin", variant: "destructive" });
      } else {
        toast({ title: "Permissão de admin removida ✅" });
        setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, isAdmin: false } : u)));
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error) {
        toast({ title: "Erro ao promover admin", variant: "destructive" });
      } else {
        toast({ title: "Usuário promovido a admin ✅" });
        setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, isAdmin: true } : u)));
      }
    }
    setToggling(null);
  };

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
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
          Usuários ({users.length})
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs font-body w-52"
            placeholder="Buscar por nome..."
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((u, i) => (
            <motion.div
              key={u.user_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-heading text-sm font-bold text-primary">
                      {getInitials(u.full_name)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                        isOnline(u.last_seen) ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/30"
                      }`}
                      title={isOnline(u.last_seen) ? "Online agora" : u.last_seen ? `Visto: ${new Date(u.last_seen).toLocaleString("pt-BR")}` : "Nunca acessou"}
                    />
                    <p className="font-heading text-sm font-semibold text-foreground truncate">
                      {u.full_name}
                    </p>
                    {u.isAdmin && u.user_id === MASTER_ADMIN_ID && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Master
                      </span>
                    )}
                    {u.isAdmin && u.user_id !== MASTER_ADMIN_ID && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                        Admin
                      </span>
                    )}
                  </div>
                  {u.phone && (
                    <p className="font-body text-xs text-muted-foreground mt-0.5">{u.phone}</p>
                  )}
                  {u.email && (
                    <p className="font-body text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                  )}
                </div>
                {u.user_id === MASTER_ADMIN_ID ? (
                  <span className="shrink-0 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground/50">
                    Protegido
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setAnamnesisUser(u)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
                      title="Ficha de Anamnese"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleAdmin(u.user_id, u.isAdmin)}
                      disabled={toggling === u.user_id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all disabled:opacity-50 ${
                        u.isAdmin
                          ? "border-destructive/20 text-destructive hover:bg-destructive/5"
                          : "border-primary/20 text-primary hover:bg-primary/5"
                      }`}
                    >
                      {u.isAdmin ? (
                        <>
                          <ShieldOff className="w-3.5 h-3.5" />
                          Remover
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Promover
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setUserToDelete(u)}
                      disabled={deleting === u.user_id}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/20 transition-all disabled:opacity-50"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{userToDelete?.full_name}</strong>? 
              Todos os dados deste usuário (agendamentos, pagamentos e perfil) serão removidos permanentemente. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={!!deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {anamnesisUser && (
        <AnamnesisModal
          open={!!anamnesisUser}
          onClose={() => setAnamnesisUser(null)}
          clientUserId={anamnesisUser.user_id}
          clientName={anamnesisUser.full_name}
          adminMode
        />
      )}
    </motion.div>
  );
};

export default AdminUsers;
