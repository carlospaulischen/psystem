import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/(auth)/login/actions";

// Área interna é inteiramente dinâmica (sessão via cookies a cada request).
export const instant = false;

const NAV = [
  { href: "/dashboard", label: "Início" },
  { href: "/agenda", label: "Agenda" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/financeiro", label: "Financeiro" },
  { href: "/documentos", label: "Documentos" },
  { href: "/configuracoes", label: "Configurações" },
];

const ROLE_LABEL: Record<string, string> = {
  clinic_admin: "Administração",
  psychologist: "Psicólogo(a)",
  receptionist: "Recepção",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireStaff();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <p className="font-semibold">psystem</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {profile.organization?.name}
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-4">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-zinc-500">
            {ROLE_LABEL[profile.role] ?? profile.role}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-900"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-zinc-50 p-8">{children}</main>
    </div>
  );
}
