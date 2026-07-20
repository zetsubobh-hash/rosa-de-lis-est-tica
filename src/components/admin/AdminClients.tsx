import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Phone, Mail, MessageCircle, UserPlus, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClientDetailModal from "@/components/admin/ClientDetailModal";
import NewClientInlineForm from "@/components/admin/NewClientInlineForm";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface Client {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  address: string;
  sex: string;
  birth_date: string | null;
  created_at: string;
  last_seen: string | null;
}

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const AdminClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, avatar_url, address, sex, birth_date, created_at, last_seen")
        .order("full_name");
      setClients((data as Client[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: search + view toggle + new client button */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center rounded-xl border border-border bg-background p-1 h-10">
            <button
              onClick={() => setViewMode("card")}
              title="Visualização em cards"
              className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                viewMode === "card"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Visualização em lista"
              className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>
          <button
            onClick={() => setShowNewClient((v) => !v)}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            {showNewClient ? "Fechar Cadastro" : "Novo Cliente"}
          </button>
        </div>
      </div>

      {/* New client form */}
      <AnimatePresence>
        {showNewClient && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <NewClientInlineForm
              onClientCreated={(client) => {
                setShowNewClient(false);
                setClients((prev) => {
                  const updated = [client as unknown as Client, ...prev];
                  return updated.sort((a, b) => a.full_name.localeCompare(b.full_name));
                });
                setSearch("");
              }}
              onCancel={() => setShowNewClient(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="font-body text-xs text-muted-foreground">
        {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-body text-muted-foreground">
            {clients.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum resultado encontrado."}
          </p>
        </div>
      ) : (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((client, i) => (
              <motion.button
                key={client.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                onClick={() => setSelectedClient(client)}
                className="bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {client.avatar_url ? (
                      <img src={client.avatar_url} alt={client.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-heading text-sm font-bold text-primary">
                        {getInitials(client.full_name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {client.full_name}
                    </p>
                    <p className="font-body text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <Phone className="w-3 h-3 shrink-0" />
                      {client.phone}
                    </p>
                    {client.email && (
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {client.email}
                      </p>
                    )}
                  </div>
                  {/* Quick action icons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={`tel:${client.phone.replace(/\D/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Ligar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={buildWhatsAppLink(client.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-[1fr,1fr,auto] gap-3 px-4 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Cliente</span>
              <span>Contato</span>
              <span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-border">
              {filtered.map((client, i) => (
                <motion.div
                  key={client.user_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="flex flex-col sm:grid sm:grid-cols-[1fr,1fr,auto] gap-2 sm:gap-3 px-4 py-3 items-start sm:items-center hover:bg-muted/30 transition-colors group"
                >
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt={client.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-heading text-xs font-bold text-primary">
                          {getInitials(client.full_name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {client.full_name}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto pl-[52px] sm:pl-0">
                    <p className="font-body text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" />
                      {client.phone}
                    </p>
                    {client.email && (
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {client.email}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                    <a
                      href={`tel:${client.phone.replace(/\D/g, "")}`}
                      className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      title="Ligar"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={buildWhatsAppLink(client.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <ClientDetailModal
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          userId={selectedClient.user_id}
          userName={selectedClient.full_name}
          avatarUrl={selectedClient.avatar_url}
        />
      )}
    </div>
  );
};

export default AdminClients;
