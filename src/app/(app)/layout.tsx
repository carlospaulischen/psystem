import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireStaff();
  const supabase = await createClient();

  // Organizações do usuário para o seletor de contexto na sidebar.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization:organizations(id, name, type)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .returns<
      { organization: { id: string; name: string; type: string } | null }[]
    >();

  const orgs = (memberships ?? [])
    .map((m) => m.organization)
    .filter((o): o is NonNullable<typeof o> => o !== null);

  return <AppShell profile={profile} orgs={orgs}>{children}</AppShell>;
}
