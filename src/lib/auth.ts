import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

// Retorna usuário autenticado + perfil (role/org do contexto ativo).
// profile.is_org_admin = clinic_admin explícito ou dono de org individual.
// Null se não logado.
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "*, organization:organizations!profiles_organization_id_fkey(id, type, name, slug)",
    )
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return { user, profile };

  // Membership da org ativa — fonte da verdade para role/status/is_admin.
  const { data: member } = await supabase
    .from("organization_members")
    .select("role, status, is_admin")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  profile.is_org_admin =
    member?.role === "clinic_admin" || member?.is_admin === true;
  profile.member_status = member?.status ?? null;

  return { user, profile };
}

// Guard para páginas da área interna.
// Sem profile → usuário de portal (paciente), manda para /portal.
// Profile inativo/bloqueado ou membership inativa na org ativa → login.
export async function requireStaff() {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/portal");
  if (session.profile.status !== "active") redirect("/login");
  if (session.profile.member_status && session.profile.member_status !== "active") {
    redirect("/login");
  }

  // MFA: sessão aal1 com fator verificado pendente → manda verificar.
  const supabase = await createClient();
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    aal.data?.nextLevel === "aal2" &&
    aal.data.currentLevel !== aal.data.nextLevel
  ) {
    redirect("/verificar-mfa");
  }

  return session as { user: NonNullable<typeof session.user>; profile: Profile };
}
