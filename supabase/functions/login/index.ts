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
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Preencha todos os campos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9._-]/g, "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up profile by username to get user_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", sanitizedUsername)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Usuário ou senha incorretos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the auth user's email using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

    if (authError || !authUser?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Usuário ou senha incorretos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in with the internal email + password
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: session, error: loginError } = await supabaseAnon.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    });

    if (loginError) {
      return new Response(
        JSON.stringify({ error: "Usuário ou senha incorretos." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", profile.user_id);
    const userRole = roles?.some((r: any) => r.role === "admin") ? "admin" : roles?.some((r: any) => r.role === "partner") ? "partner" : "user";
    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("user_id", profile.user_id).maybeSingle();
    await supabaseAdmin.from("audit_logs").insert({
      user_id: profile.user_id,
      user_name: prof?.full_name || sanitizedUsername,
      user_role: userRole,
      action: "login",
      details: {},
    });

    return new Response(
      JSON.stringify({
        access_token: session.session?.access_token,
        refresh_token: session.session?.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
