import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

// Retorna usuário autenticado + perfil (role/org). Null se não logado.
export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(id, type, name, slug)")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
}

// Guard para páginas da área interna.
export async function requireStaff() {
  const session = await getSessionProfile();
  if (!session?.profile || session.profile.status !== "active") {
    redirect("/login");
  }
  return session as { user: NonNullable<typeof session.user>; profile: Profile };
}
