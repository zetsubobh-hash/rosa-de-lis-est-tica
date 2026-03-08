import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_OG_IMAGE = "https://sxzmtnsfsyifujdnqyzr.supabase.co/storage/v1/object/public/branding/og-image.png";
const DEFAULT_CANONICAL = "https://rosadelis.com";

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing server configuration", { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["seo_og_image", "seo_canonical_url"]);

    if (error) {
      throw error;
    }

    const settingsMap: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => {
      settingsMap[row.key] = row.value;
    });

    const canonicalBase = (settingsMap.seo_canonical_url || DEFAULT_CANONICAL).replace(/\/$/, "");
    const rawImage = settingsMap.seo_og_image?.trim() || DEFAULT_OG_IMAGE;
    const finalImage = rawImage.startsWith("http") ? rawImage : `${canonicalBase}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

    return Response.redirect(finalImage, 302);
  } catch (err) {
    console.error("seo-og-image error", err);
    return Response.redirect(DEFAULT_OG_IMAGE, 302);
  }
});
