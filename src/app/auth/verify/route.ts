import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verificação de links gerados por generateLink (convites e recuperação).
// O e-mail aponta para o nosso domínio — o usuário nunca vê a URL
// supabase.co. verifyOtp troca o token_hash pela sessão nos cookies.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const validTypes = ["invite", "recovery", "magiclink", "signup", "email_change"] as const;
  const safeNext = next?.startsWith("/") ? next : "/dashboard";

  if (tokenHash && validTypes.includes(type as (typeof validTypes)[number])) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as (typeof validTypes)[number],
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
