import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logout dedicado — mais confiável que server action via onSelect:
// encerra a sessão Supabase, limpa a flag de acesso suporte se ativa
// e redireciona para /login.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const supportUntil = user?.app_metadata?.support_until as
    | string
    | undefined;
  if (user && supportUntil) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { support_until: null },
      });
    } catch {
      // falha na limpeza não deve impedir o logout
    }
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
