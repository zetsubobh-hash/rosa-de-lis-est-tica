import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DBService {
  id: string;
  slug: string;
  title: string;
  icon_name: string;
  short_description: string;
  full_description: string;
  benefits: string[];
  duration: string;
  price_label: string;
  sessions_label: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useServices = (includeInactive = false) => {
  const [services, setServices] = useState<DBService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    let query = supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data } = await query;
    if (data) setServices(data as DBService[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [includeInactive]);

  return { services, loading, refetch: fetchServices };
};
