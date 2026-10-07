"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "./actions";

const ACTIONS = [
  { status: "confirmed", label: "Confirmar" },
  { status: "completed", label: "Marcar como realizada" },
  { status: "no_show", label: "Marcar falta" },
  { status: "cancelled", label: "Cancelar" },
];

export function AppointmentStatusMenu({
  appointmentId,
}: {
  appointmentId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
        Ações
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ACTIONS.map((a) => (
          <DropdownMenuItem
            key={a.status}
            onSelect={() => updateAppointmentStatus(appointmentId, a.status)}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
