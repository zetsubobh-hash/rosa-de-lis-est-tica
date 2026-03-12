import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Phone, Mail, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClientDetailModal from "@/components/admin/ClientDetailModal";

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
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary focus:outline-none"
        />
      </div>

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
              </div>
            </motion.button>
          ))}
        </div>
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
