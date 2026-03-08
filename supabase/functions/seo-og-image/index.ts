import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_OG_IMAGE = "https://sxzmtnsfsyifujdnqyzr.supabase.co/storage/v1/object/public/branding/og-image.png";
const DEFAULT_CANONICAL = "https://rosadelis.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const withVersion = (url: string, version: string) => `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

const buildAbsoluteImageUrl = (rawImage: string, canonicalBase: string) =>
  rawImage.startsWith("http")
    ? rawImage
    : `${canonicalBase}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

const proxyImageResponse = async (imageUrl: string, version: string) => {
  const upstream = await fetch(withVersion(imageUrl, version), {
    method: "GET",
    redirect: "follow",
  });

  if (!upstream.ok) {
    throw new Error(`Failed to fetch OG image: ${upstream.status}`);
  }

  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("content-type") || "image/png",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "none",
    },
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing server configuration", {
      status: 500,
      headers: { ...corsHeaders, "Cache-Control": "no-store, max-age=0" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value, updated_at")
      .in("key", ["seo_og_image", "seo_canonical_url"]);

    if (error) throw error;

    const settingsMap: Record<string, string> = {};
    let ogUpdatedAt = "";

    (data ?? []).forEach((row: { key: string; value: string; updated_at?: string }) => {
      settingsMap[row.key] = row.value;
      if (row.key === "seo_og_image" && row.updated_at) {
        ogUpdatedAt = row.updated_at;
      }
    });

    const canonicalBase = (settingsMap.seo_canonical_url || DEFAULT_CANONICAL).replace(/\/$/, "");
    const rawImage = settingsMap.seo_og_image?.trim() || DEFAULT_OG_IMAGE;
    const imageUrl = buildAbsoluteImageUrl(rawImage, canonicalBase);
    const version = ogUpdatedAt ? new Date(ogUpdatedAt).getTime().toString() : Date.now().toString();

    return await proxyImageResponse(imageUrl, version);
  } catch (err) {
    console.error("seo-og-image error", err);

    try {
      return await proxyImageResponse(DEFAULT_OG_IMAGE, Date.now().toString());
    } catch {
      return new Response("OG image unavailable", {
        status: 503,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      });
    }
  }
});
