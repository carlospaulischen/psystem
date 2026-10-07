import { requireStaff } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

// Área interna é inteiramente dinâmica (sessão via cookies a cada request).
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff();

  return (
    <div className="flex min-h-dvh flex-1">
      <AppSidebar profile={profile} />
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
