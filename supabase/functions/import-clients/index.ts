import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Row { full_name: string; phone: string; birth_date: string | null }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rows } = await req.json() as { rows: Row[] };

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const guard = req.headers.get("x-import-guard");
    if (guard !== "rdl-import-2026-07-27") {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await admin.from("profiles").select("phone, username, full_name").limit(10000);
    const phones = new Set((existing || []).map((p) => (p.phone || "").replace(/\D/g, "")));
    const usernames = new Set((existing || []).map((p) => p.username));
    const names = new Set((existing || []).map((p) => (p.full_name || "").toLowerCase().trim()));

    let created = 0; const skipped: string[] = []; const errors: string[] = [];

    for (const row of rows) {
      const digits = (row.phone || "").replace(/\D/g, "");
      const nameKey = row.full_name.toLowerCase().trim();
      if ((digits && phones.has(digits)) || names.has(nameKey)) { skipped.push(row.full_name); continue; }

      let base = nameKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
      let username = base; let i = 1;
      while (usernames.has(username)) username = `${base}${++i}`;

      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: `${crypto.randomUUID()}@rosadelis.internal`,
        password: crypto.randomUUID().slice(0, 12),
        email_confirm: true,
        user_metadata: { full_name: row.full_name, username },
      });
      if (createError || !userData?.user) { errors.push(`${row.full_name}: ${createError?.message}`); continue; }

      const { error: profileError } = await admin.from("profiles").insert({
        user_id: userData.user.id,
        full_name: row.full_name,
        username,
        phone: digits,
        birth_date: row.birth_date,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(userData.user.id);
        errors.push(`${row.full_name}: ${profileError.message}`);
        continue;
      }
      phones.add(digits); usernames.add(username); names.add(nameKey); created++;
    }

    return new Response(JSON.stringify({ created, skipped: skipped.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
