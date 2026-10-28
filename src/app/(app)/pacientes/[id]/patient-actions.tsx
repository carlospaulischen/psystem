"use client";

import { useTransition } from "react";
import { EllipsisVertical, Loader2 } from "lucide-react";
import { updatePatientStatus } from "../actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const STATUS_ACTIONS: Record<string, { label: string; next: string }[]> = {
  active: [
    { label: "Pausar acompanhamento", next: "paused" },
    { label: "Arquivar paciente", next: "archived" },
  ],
  paused: [
    { label: "Retomar acompanhamento", next: "active" },
    { label: "Arquivar paciente", next: "archived" },
  ],
  archived: [{ label: "Reativar paciente", next: "active" }],
};

export function PatientActions({
  patientId,
  status,
}: {
  patientId: string;
  status: string;
}) {
  const actions = STATUS_ACTIONS[status] ?? [
    { label: "Reativar paciente", next: "active" },
  ];

  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Ações" disabled={pending} />
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <EllipsisVertical className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.next}
            disabled={pending}
            onSelect={() =>
              startTransition(() => updatePatientStatus(patientId, a.next))
            }
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
