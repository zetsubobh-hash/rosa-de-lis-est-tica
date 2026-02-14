import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = Record<string, string>;

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings" as any)
      .select("key, value");
    if (data) {
      const map: SiteSettings = {};
      (data as any[]).forEach((row) => {
        map[row.key] = row.value;
      });
      setSettings(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    // Try upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from("site_settings" as any)
      .select("id")
      .eq("key", key)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("site_settings" as any)
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq("key", key));
    } else {
      ({ error } = await supabase
        .from("site_settings" as any)
        .insert({ key, value } as any));
    }

    if (!error) {
      setSettings((prev) => ({ ...prev, [key]: value }));
    }
    return { error };
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};
