"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAuthEmail } from "@/lib/messages";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
  }

  // Usuário com TOTP ativo: a sessão nasce aal1 — exige o segundo fator.
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    aal.data?.nextLevel === "aal2" &&
    aal.data.currentLevel !== aal.data.nextLevel
  ) {
    redirect(`/verificar-mfa?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Recuperação de senha — sempre responde o mesmo para não vazar
// se o e-mail existe ou não na base. O e-mail sai pelo Resend: o SMTP
// do Auth é do projeto inteiro, compartilhado com outro app.
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  if (email) {
    const admin = createAdminClient();
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/nova-senha` },
    });

    // Link com nosso domínio: /auth/verify usa o token_hash + verifyOtp.
    const actionLink = link?.properties?.hashed_token
      ? `${origin}/auth/verify?token_hash=${link.properties.hashed_token}&type=recovery&next=/nova-senha`
      : link?.properties?.action_link;
    // Só envia para usuários do psystem — a base Auth é compartilhada e
    // um e-mail de outro app receberia nosso branding por engano.
    const isPsystemUser =
      link?.user?.user_metadata?.app === "psystem" ||
      (link?.user?.id &&
        (await admin
          .from("profiles")
          .select("id")
          .eq("id", link.user.id)
          .maybeSingle()).data) ||
      (link?.user?.id &&
        (await admin
          .from("patient_accounts")
          .select("patient_id")
          .eq("user_id", link.user.id)
          .maybeSingle()).data);

    if (actionLink && isPsystemUser) {
      await sendAuthEmail("password_reset", {
        to: email,
        name: link.user?.user_metadata?.full_name as string | undefined,
        actionLink,
      });
    } else {
      console.error(
        `[auth] reset não enviado: ${!link?.user ? "usuário inexistente" : !actionLink ? "link não gerado" : "usuário fora do psystem"}`,
      );
    }
  }

  redirect("/login?sent=1");
}

// Definição de nova senha (pós-recuperação ou primeiro acesso por convite).
// Ativa o profile "invited" → "active" após definir a senha.
export async function setNewPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  if (password.length < 8 || password !== confirm) {
    redirect("/nova-senha?error=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/nova-senha?error=save");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // RPC ativa profile + memberships "invited" → "active" (update direto
    // em profiles.status não é permitido — grants por coluna).
    await supabase.rpc("activate_my_account");
  }

  redirect("/dashboard");
}
