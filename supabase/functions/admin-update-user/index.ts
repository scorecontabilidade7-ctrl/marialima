import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGIN_PATTERNS = [
  /\.vercel\.app$/,
  /\.scoreconsultoria\.com\.br$/,
  /^https:\/\/lunsyufvxkiivnrhpxpj\.supabase\.co$/,
  /^http:\/\/localhost:\d+$/,
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

    if (!adminRole) throw new Error("Apenas administradores podem atualizar usuários");

    // Atualizar usuário usando service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, email, password, full_name, role, active } = await req.json();

    if (!userId) throw new Error("ID do usuário não fornecido");

    // Prepara os dados de atualização da Auth
    const updateData: any = {
      user_metadata: { full_name }
    };
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (active !== undefined) {
      updateData.ban_duration = active ? "none" : "876000h"; // none desbane, 876000h bane por 100 anos
    }

    const { data: updatedUserData, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (updateError) throw updateError;
    if (!updatedUserData.user) throw new Error("Falha ao atualizar usuário");

    // Atualizar role (apagar a antiga e inserir a nova se role foi enviada)
    if (role) {
      const { error: deleteRoleError } = await adminClient
        .from("marialima_user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteRoleError) throw deleteRoleError;

      const { error: roleError } = await adminClient
        .from("marialima_user_roles")
        .insert({ user_id: userId, role });
      if (roleError) throw roleError;
    }

    // Atualizar perfil public (se o trigger da auth não sobrepor ou se precisarmos atualizar active)
    if (active !== undefined || full_name) {
       const profileUpdate: any = {};
       if (active !== undefined) profileUpdate.active = active;
       if (full_name) profileUpdate.full_name = full_name;

       const { error: profileError } = await adminClient
         .from("marialima_profiles")
         .update(profileUpdate)
         .eq("id", userId);
       if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ user: updatedUserData.user }),
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
