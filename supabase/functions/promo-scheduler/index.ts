import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const nowIso = new Date().toISOString();

    const { data: due, error } = await supabase
      .from("promo_campaigns")
      .select("id, title, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at")
      .limit(5);

    if (error) throw error;
    if (!due || due.length === 0) return json({ triggered: 0 });

    const triggered: string[] = [];

    for (const camp of due) {
      // Claim the campaign so a concurrent tick can't fire it twice
      const { data: claimed } = await supabase
        .from("promo_campaigns")
        .update({ status: "sending", started_at: new Date().toISOString(), last_error: null })
        .eq("id", camp.id)
        .eq("status", "scheduled")
        .select("id")
        .maybeSingle();

      if (!claimed) continue;

      triggered.push(camp.id);

      // Fire and forget — promo-broadcast runs long (anti-block pacing)
      fetch(`${SUPABASE_URL}/functions/v1/promo-broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ campaign_id: camp.id }),
      }).catch(async (err) => {
        console.error("failed to start campaign", camp.id, err);
        await supabase
          .from("promo_campaigns")
          .update({ status: "failed", last_error: String(err).substring(0, 500), finished_at: new Date().toISOString() })
          .eq("id", camp.id);
      });
    }

    return json({ triggered: triggered.length, ids: triggered });
  } catch (err: any) {
    console.error("promo-scheduler error:", err);
    return json({ error: err.message }, 500);
  }
});
