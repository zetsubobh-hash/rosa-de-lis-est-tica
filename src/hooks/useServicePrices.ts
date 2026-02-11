import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServicePrice {
  id: string;
  service_slug: string;
  plan_name: string;
  sessions: number;
  price_per_session_cents: number;
  total_price_cents: number;
}

export const formatCents = (cents: number): string => {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
};

export const parseBRL = (value: string): number => {
  // "R$ 1.300,00" → 130000
  const clean = value.replace(/[R$\s.]/g, "").replace(",", ".");
  return Math.round(parseFloat(clean) * 100) || 0;
};

export const useServicePrices = (serviceSlug?: string) => {
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    setLoading(true);
    let query = supabase.from("service_prices").select("*");
    if (serviceSlug) {
      query = query.eq("service_slug", serviceSlug);
    }
    query = query.order("service_slug").order("plan_name");
    const { data } = await query;
    if (data) setPrices(data as ServicePrice[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, [serviceSlug]);

  return { prices, loading, refetch: fetchPrices };
};

export const useAllServicePrices = () => {
  return useServicePrices();
};

export const getPriceForPlan = (
  prices: ServicePrice[],
  serviceSlug: string,
  planName: string
): ServicePrice | undefined => {
  return prices.find(
    (p) => p.service_slug === serviceSlug && p.plan_name === planName
  );
};
