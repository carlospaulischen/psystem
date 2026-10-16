"use client";

import { useTransition } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import { switchOrganization } from "@/app/(app)/org-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Org = { id: string; name: string; type: string };

// Seletor de contexto para quem pertence a mais de uma organização
// (ex.: consultório particular + clínica). Com 1 org, vira só o nome.
export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: Org[];
  activeOrgId: string;
}) {
  const [pending, startTransition] = useTransition();
  const active = orgs.find((o) => o.id === activeOrgId);

  if (orgs.length <= 1) {
    return (
      <p className="mt-2 truncate text-xs text-sidebar-foreground/60">
        {active?.name}
      </p>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="mt-2 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Building2 className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {pending ? "Alternando…" : active?.name}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-56">
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => startTransition(() => switchOrganization(o.id))}
          >
            <span className="truncate">{o.name}</span>
            {o.type === "individual" && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                particular
              </span>
            )}
            {o.id === activeOrgId && (
              <span className="ml-auto text-[10px] text-primary">atual</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
