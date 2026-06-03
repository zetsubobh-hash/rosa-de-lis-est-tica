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

    const emptyResult = (reason: string) => ({
      rating: 0,
      totalReviews: 0,
      reviews: [],
      fallback: true,
      reason,
    });

    const jsonOk = (body: unknown) =>
      new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!apiKey) return jsonOk(emptyResult("missing_api_key"));
    if (!placeId) return jsonOk(emptyResult("missing_place_id"));

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=pt-BR&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Google Places API error:", data.status, data.error_message);
      return jsonOk(emptyResult(`api_${data.status}`));
    }

    return jsonOk({
      rating: data.result?.rating ?? 0,
      totalReviews: data.result?.user_ratings_total ?? 0,
      reviews: (data.result?.reviews ?? []).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        timeAgo: r.relative_time_description,
        profilePhoto: r.profile_photo_url,
      })),
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ rating: 0, totalReviews: 0, reviews: [], fallback: true, reason: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
