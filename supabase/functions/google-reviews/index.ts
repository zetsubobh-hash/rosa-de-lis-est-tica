import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read settings from site_settings table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["google_place_id", "google_api_key"]);

    const settingsMap: Record<string, string> = {};
    (settings ?? []).forEach((row: any) => {
      settingsMap[row.key] = row.value;
    });

    const placeId = settingsMap["google_place_id"] || "";
    const apiKey = settingsMap["google_api_key"] || Deno.env.get("GOOGLE_PLACES_API_KEY") || "";

    if (!apiKey) {
      throw new Error("Google Places API Key não configurada. Vá em Admin → Configurações.");
    }
    if (!placeId) {
      throw new Error("Google Place ID não configurado. Vá em Admin → Configurações.");
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=pt-BR&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const result = {
      rating: data.result?.rating ?? 5,
      totalReviews: data.result?.user_ratings_total ?? 0,
      reviews: (data.result?.reviews ?? []).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        timeAgo: r.relative_time_description,
        profilePhoto: r.profile_photo_url,
      })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
