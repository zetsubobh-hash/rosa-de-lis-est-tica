import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ClientOption = { user_id: string; full_name: string };

export function useAgendaClientSearch(search: string, enabled: boolean) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(false);
    setClients([]);
    const timer = setTimeout(async () => {
      try {
        const result = await supabase.rpc("search_agenda_clients", { _search: search.trim() })
          .order("full_name").order("user_id").range(0, 99);
        if (!active) return;
        if (result.error) setError(true);
        else setClients(result.data ?? []);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, enabled]);

  return { clients, loading, error };
}