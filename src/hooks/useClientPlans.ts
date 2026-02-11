import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientPlan {
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
  updated_at: string;
  notes: string | null;
}

export const useClientPlans = (userId?: string) => {
  const [plans, setPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    let query = supabase
      .from("client_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data } = await query;
    setPlans((data as ClientPlan[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, [userId]);

  return { plans, loading, refetch: fetchPlans };
};
