import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT and get user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub as string;

    // Check admin role
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const { partner_id, username, password } = await req.json();

    if (!partner_id || !username || !password) {
      return new Response(JSON.stringify({ error: "partner_id, username e password são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (sanitizedUsername.length < 3) {
      return new Response(JSON.stringify({ error: "Username deve ter pelo menos 3 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if username already taken
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("user_id")
      .eq("username", sanitizedUsername)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Username já está em uso" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the partner data
    const { data: partner, error: partnerError } = await serviceClient
      .from("partners")
      .select("*")
      .eq("id", partner_id)
      .single();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const internalEmail = `${crypto.randomUUID()}@rosadelis.internal`;
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: partner.full_name, username: sanitizedUsername },
    });

    if (createError) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = userData.user.id;

    // Create profile
    const { error: profileError } = await serviceClient.from("profiles").insert({
      user_id: newUserId,
      full_name: partner.full_name,
      username: sanitizedUsername,
      phone: partner.phone || "",
      address: "",
      sex: "feminino",
    });

    if (profileError) {
      console.error("Profile create error:", profileError);
    }

    // Add partner role
    await serviceClient.from("user_roles").upsert(
      { user_id: newUserId, role: "partner" },
      { onConflict: "user_id,role" }
    );

    // Update partner record with real user_id
    const { error: updateError } = await serviceClient
      .from("partners")
      .update({ user_id: newUserId })
      .eq("id", partner_id);

    if (updateError) {
      console.error("Partner update error:", updateError);
      return new Response(JSON.stringify({ error: "Conta criada mas erro ao vincular: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
