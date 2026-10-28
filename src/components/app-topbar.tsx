"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Ordem importa: prefixos mais específicos primeiro.
const TITLES: [string, string][] = [
  ["/pacientes/novo", "Novo paciente"],
  ["/pacientes", "Pacientes"],
  ["/agenda/novo", "Novo agendamento"],
  ["/agenda", "Agenda"],
  ["/financeiro/nova", "Nova cobrança"],
  ["/financeiro", "Financeiro"],
  ["/documentos/novo", "Novo documento"],
  ["/documentos", "Documentos"],
  ["/auditoria", "Auditoria"],
  ["/configuracoes", "Configurações"],
  ["/dashboard", "Início"],
];

export function AppTopbar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const title =
    TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "PSYSTEM";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          className="rounded-md p-2 hover:bg-muted lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
      )}
      <p className="text-sm text-muted-foreground">
        PSYSTEM
        <span className="mx-2 text-border">/</span>
        <span className="font-medium text-foreground">{title}</span>
      </p>

      <form
        className="ml-auto"
        action={(formData) => {
          const q = String(formData.get("q") ?? "").trim();
          router.push(q ? `/pacientes?q=${encodeURIComponent(q)}` : "/pacientes");
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Buscar paciente…"
            className="h-9 w-36 pl-9 sm:w-56 md:w-64"
          />
        </div>
      </form>
    </header>
  );
}
