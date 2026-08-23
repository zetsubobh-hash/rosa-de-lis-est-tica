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

const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

const normalizePhone = (raw: string) => {
  let d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length === 8 || d.length === 9) d = "31" + d;
  return d.slice(0, 11);
};

const normalizeName = (v: string) =>
  (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const titleCase = (v: string) =>
  (v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length <= 2 && ["de", "da", "do", "e"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

const parseDate = (raw: unknown): string | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let year = m[3];
    if (year.length === 2) year = Number(year) > 30 ? `19${year}` : `20${year}`;
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
};

const slugUsername = (name: string) =>
  normalizeName(name).replace(/[^a-z0-9]/g, "").slice(0, 18) || "cliente";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Token inválido" }, 401);

    const callerId = claimsData.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Acesso restrito a administradores" }, 403);

    const body = await req.json().catch(() => null);
    const rows = Array.isArray(body?.rows) ? body.rows : null;
    const dryRun = body?.dryRun === true;
    if (!rows) return json({ error: "Nenhuma linha enviada" }, 400);
    if (!dryRun && rows.length > 500) return json({ error: "Máximo de 500 linhas por lote" }, 400);
    if (dryRun && rows.length > 10000) return json({ error: "Máximo de 10000 linhas por análise" }, 400);

    // Load existing profiles for dedupe
    const { data: existing } = await admin
      .from("profiles")
      .select("phone, full_name, username")
      .limit(20000);

    const phones = new Set<string>();
    const names = new Set<string>();
    const usernames = new Set<string>();
    (existing || []).forEach((p: any) => {
      const ph = normalizePhone(p.phone || "");
      if (ph) phones.add(ph);
      if (p.full_name) names.add(normalizeName(p.full_name));
      if (p.username) usernames.add(p.username);
    });

    // ---- Preview (dry run): classify without writing anything ----
    if (dryRun) {
      const seenPhones = new Set<string>();
      const seenNames = new Set<string>();
      let novos = 0;
      let duplicados = 0;
      let invalidos = 0;
      const samples: { row: number; full_name: string; phone: string; status: string; reason: string }[] = [];

      rows.forEach((row: any, idx: number) => {
        const fullNameRaw = String(row?.full_name ?? "").trim();
        const phone = normalizePhone(String(row?.phone ?? ""));
        let status = "novo";
        let reason = "";

        if (fullNameRaw.length < 3) {
          status = "invalido";
          reason = "Nome ausente ou muito curto";
        } else if (phone && phone.length < 10) {
          status = "invalido";
          reason = "Telefone inválido";
        } else {
          const nkey = normalizeName(titleCase(fullNameRaw));
          if ((phone && phones.has(phone)) || names.has(nkey)) {
            status = "duplicado";
            reason = "Já cadastrado na base";
          } else if ((phone && seenPhones.has(phone)) || seenNames.has(nkey)) {
            status = "duplicado";
            reason = "Repetido na própria planilha";
          } else {
            if (phone) seenPhones.add(phone);
            seenNames.add(nkey);
          }
        }

        if (status === "novo") novos++;
        else if (status === "duplicado") duplicados++;
        else invalidos++;

        if (status !== "novo" && samples.length < 50) {
          samples.push({ row: idx + 2, full_name: fullNameRaw || "(sem nome)", phone, status, reason });
        }
      });

      return json({ success: true, preview: true, total: rows.length, novos, duplicados, invalidos, samples });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];


    for (const row of rows) {
      const fullNameRaw = String(row?.full_name ?? "").trim();
      const phone = normalizePhone(String(row?.phone ?? ""));
      if (fullNameRaw.length < 3 || (phone && phone.length < 10)) {
        skipped++;
        continue;
      }
      const fullName = titleCase(fullNameRaw);
      const nkey = normalizeName(fullName);


      if ((phone && phones.has(phone)) || names.has(nkey)) {
        skipped++;
        continue;
      }

      let username = slugUsername(fullName);
      let candidate = username;
      let i = 1;
      while (usernames.has(candidate)) {
        candidate = `${username}${i++}`;
      }
      username = candidate;

      const internalEmail = `${crypto.randomUUID()}@rosadelis.internal`;
      const password = crypto.randomUUID().slice(0, 12);

      const { data: userData, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });

      if (createError || !userData?.user) {
        errors.push(`${fullName}: ${createError?.message || "erro ao criar usuário"}`);
        continue;
      }

      const { error: profileError } = await admin.from("profiles").insert({
        user_id: userData.user.id,
        full_name: fullName,
        username,
        phone: phone || "00000000000",
        email: String(row?.email ?? "").trim() || null,
        address: String(row?.address ?? "").trim() || null,
        birth_date: parseDate(row?.birth_date),
      });

      if (profileError) {
        await admin.auth.admin.deleteUser(userData.user.id);
        errors.push(`${fullName}: ${profileError.message}`);
        continue;
      }

      created++;
      if (phone) phones.add(phone);
      names.add(nkey);
      usernames.add(username);
    }

    return json({ success: true, created, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error("import-clients error", err);
    return json({ error: "Erro interno" }, 500);
  }
});
