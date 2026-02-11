import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, GripVertical, Eye, EyeOff,
  ChevronDown, ChevronUp, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useServices, DBService } from "@/hooks/useServices";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminServiceEditor from "./AdminServiceEditor";

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
  const [editing, setEditing] = useState<{ service: DBService; isNew: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openNew = () => {
    const maxOrder = services.reduce((max, s) => Math.max(max, s.sort_order), 0);
    setEditing({
      service: {
        ...emptyService,
        sort_order: maxOrder + 1,
        id: "",
        created_at: "",
        updated_at: "",
      } as DBService,
      isNew: true,
    });
  };

  const openEdit = (service: DBService) => {
    setEditing({ service: { ...service, benefits: [...service.benefits] }, isNew: false });
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

  // If editing, show the visual editor full-screen
  if (editing) {
    return (
      <AdminServiceEditor
        service={editing.service}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refetch(); }}
      />
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
              {service.image_url && (
                <img src={service.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              )}
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
    </motion.div>
  );
};

export default AdminServices;
