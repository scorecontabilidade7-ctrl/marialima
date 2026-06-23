import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGIN_PATTERNS = [
  /\.vercel\.app$/,
  /\.scoreconsultoria\.com\.br$/,
  /^https:\/\/lunsyufvxkiivnrhpxpj\.supabase\.co$/,
  /^http:\/\/localhost:(8080|5173)$/,
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Token de autenticação ausente");

    // Verificar se o chamador é admin usando o JWT dele
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) throw new Error("Não autorizado");

    const { data: adminRole } = await userClient
      .from("marialima_user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) throw new Error("Apenas administradores podem criar usuários");

    // Criar usuário usando service role (não afeta a sessão atual)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { username, email, password, full_name, role } = await req.json();
    const resolvedEmail = email || `${username}@admin.com`;

    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: resolvedEmail,
      password,
      user_metadata: { username, full_name },
      email_confirm: true,
    });

    if (createError) throw createError;
    if (!newUserData.user) throw new Error("Falha ao criar usuário");

    // Atribuir role usando service role (bypassa RLS)
    if (role) {
      const { error: roleError } = await adminClient
        .from("marialima_user_roles")
        .insert({ user_id: newUserData.user.id, role });
      if (roleError) throw roleError;
    }

    return new Response(
      JSON.stringify({ user: newUserData.user }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }, status: 400 }
    );
  }
});
