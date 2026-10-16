"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Recuperação de senha — sempre responde o mesmo para não vazar
// se o e-mail existe ou não na base.
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/nova-senha`,
  });

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
