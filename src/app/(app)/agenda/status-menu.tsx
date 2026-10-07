"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateAppointmentStatus } from "./actions";
import { RescheduleDialog } from "./reschedule-dialog";

const ACTIONS = [
  { status: "confirmed", label: "Confirmar" },
  { status: "completed", label: "Marcar como realizada" },
  { status: "no_show", label: "Marcar falta" },
  { status: "cancelled", label: "Cancelar" },
];

export function AppointmentStatusMenu({
  appointmentId,
  startsAt,
}: {
  appointmentId: string;
  startsAt: string;
}) {
  const [rescheduling, setRescheduling] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
          Ações
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRescheduling(true)}>
            Remarcar…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
      <RescheduleDialog
        appointmentId={appointmentId}
        currentStart={startsAt}
        open={rescheduling}
        onOpenChange={setRescheduling}
      />
    </>
  );
}
