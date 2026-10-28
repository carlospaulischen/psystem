import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

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

  return (
    <div className="flex min-h-dvh flex-1">
      <AppSidebar profile={profile} orgs={orgs} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/40">
        <AppTopbar />
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
