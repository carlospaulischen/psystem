import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role — bypassa RLS. Usar APENAS em código server-side confiável
// (webhooks, jobs, seeds). Nunca importar em componentes de cliente.
// Acesso excepcional deve ser auditado (permissions-matrix.md §13).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
