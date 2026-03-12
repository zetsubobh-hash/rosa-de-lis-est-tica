import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const { campaign_id } = await req.json();
    if (!campaign_id) return json({ error: "campaign_id required" }, 400);

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("promo_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campErr || !campaign) return json({ error: "Campaign not found" }, 404);

    // Fetch active instances ordered
    const { data: instances } = await supabase
      .from("evolution_instances")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (!instances || instances.length === 0) return json({ error: "No active instances" }, 400);

    // Fetch all clients with phone
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone");
    if (!allProfiles || allProfiles.length === 0) return json({ error: "No clients found" }, 400);

    // Fetch unsubscribed phones
    const { data: unsubRows } = await supabase
      .from("promo_unsubscribes")
      .select("phone");
    const unsubPhones = new Set((unsubRows || []).map((r: any) => r.phone));

    // Filter out unsubscribed
    const profiles = allProfiles.filter((p: any) => {
      const normalized = normalizePhone(p.phone || "");
      return normalized && !unsubPhones.has(normalized);
    });
    if (profiles.length === 0) return json({ error: "Todos os clientes cancelaram o recebimento de promoções" }, 400);

    // Get business name & site URL
    const { data: settingsRows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["business_name", "site_url"]);
    const settingsMap: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => { settingsMap[r.key] = r.value; });
    const businessName = settingsMap.business_name || "Nossa Clínica";

    // Build unsubscribe base URL
    const { data: appUrlRow } = await supabase
      .from("payment_settings")
      .select("value")
      .eq("key", "app_install_url")
      .maybeSingle();
    const siteBaseUrl = (appUrlRow?.value || settingsMap.site_url || "").replace(/\/+$/, "");

    // Get service title if specified
    let serviceTitle = "nossos serviços";
    if (campaign.service_slug && campaign.service_slug !== "all") {
      const { data: svc } = await supabase
        .from("services")
        .select("title")
        .eq("slug", campaign.service_slug)
        .maybeSingle();
      if (svc) serviceTitle = svc.title;
    }

    // Update campaign status
    await supabase
      .from("promo_campaigns")
      .update({ status: "sending", total_target: profiles.length, total_sent: 0, total_failed: 0, current_instance_index: 0 })
      .eq("id", campaign_id);

    // Create send records (preserve full history of every run)
    const sendRecords = profiles.map((p: any) => ({
      campaign_id,
      user_id: p.user_id,
      phone: p.phone,
      status: "pending",
    }));

    // Insert run records in batches and keep inserted ids for precise updates
    const insertedRecords: Array<{ id: string; user_id: string; phone: string }> = [];
    for (let i = 0; i < sendRecords.length; i += 500) {
      const batch = sendRecords.slice(i, i + 500);
      const { data: insertedBatch, error: insertErr } = await supabase
        .from("promo_sends")
        .insert(batch)
        .select("id, user_id, phone");

      if (insertErr) throw insertErr;
      if (insertedBatch) insertedRecords.push(...(insertedBatch as Array<{ id: string; user_id: string; phone: string }>));
    }

    // Now process sends with instance rotation
    let instanceIdx = 0;
    let sentOnCurrentInstance = 0;
    let totalSent = 0;
    let totalFailed = 0;

    const template = campaign.message_template || "";
    const profileByUserId = new Map(profiles.map((p: any) => [p.user_id, p]));

    for (const record of insertedRecords) {
      const currentInstance = instances[instanceIdx];
      const profile = profileByUserId.get(record.user_id);
      const phone = normalizePhone(record.phone || profile?.phone || "");

      if (!phone) {
        totalFailed++;
        await supabase
          .from("promo_sends")
          .update({ status: "failed", error_message: "Invalid phone", sent_at: new Date().toISOString() })
          .eq("id", record.id);
        continue;
      }

      // Build message with unsubscribe footer
      let message = template
        .replace(/{nome}/g, profile?.full_name || "Cliente")
        .replace(/{servico}/g, serviceTitle)
        .replace(/{empresa}/g, businessName)
        .replace(/{telefone}/g, record.phone || profile?.phone || "");

      // Append opt-out link
      if (siteBaseUrl) {
        const unsubUrl = `${siteBaseUrl}/cancelar?phone=${encodeURIComponent(phone)}`;
        message += `\n\n---\n_Não deseja mais receber promoções? Cancele aqui:_ ${unsubUrl}`;
      }

      // Send via Evolution API
      try {
        const apiUrl = currentInstance.api_url.replace(/\/+$/, "");
        const resp = await fetch(
          `${apiUrl}/message/sendText/${currentInstance.instance_name}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: currentInstance.api_key,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          }
        );

        if (resp.ok) {
          totalSent++;
          await supabase
            .from("promo_sends")
            .update({ status: "sent", instance_id: currentInstance.id, sent_at: new Date().toISOString() })
            .eq("id", record.id);
        } else {
          const errBody = await resp.text();
          totalFailed++;
          await supabase
            .from("promo_sends")
            .update({ status: "failed", instance_id: currentInstance.id, error_message: errBody.substring(0, 500), sent_at: new Date().toISOString() })
            .eq("id", record.id);
        }
      } catch (err: any) {
        totalFailed++;
        await supabase
          .from("promo_sends")
          .update({ status: "failed", instance_id: currentInstance.id, error_message: err.message?.substring(0, 500), sent_at: new Date().toISOString() })
          .eq("id", record.id);
      }

      sentOnCurrentInstance++;

      // Rotate instance if limit reached
      if (sentOnCurrentInstance >= currentInstance.msgs_per_cycle) {
        instanceIdx = (instanceIdx + 1) % instances.length;
        sentOnCurrentInstance = 0;
      }

      // Wait interval between messages
      if (campaign.interval_seconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, campaign.interval_seconds * 1000));
      }
    }

    // Update campaign final status
    await supabase
      .from("promo_campaigns")
      .update({ status: "completed", total_sent: totalSent, total_failed: totalFailed })
      .eq("id", campaign_id);

    return json({ success: true, queued: profiles.length, sent: totalSent, failed: totalFailed });
  } catch (err: any) {
    console.error("promo-broadcast error:", err);
    return json({ error: err.message }, 500);
  }
});

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11) digits = "55" + digits;
  if (digits.length === 10) digits = "55" + digits;
  if (digits.length < 12) return null;
  return digits;
}
