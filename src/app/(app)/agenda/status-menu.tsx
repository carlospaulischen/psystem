"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          Ações
          {pending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRescheduling(true)}>
            Remarcar…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {ACTIONS.map((a) => (
            <DropdownMenuItem
              key={a.status}
              disabled={pending}
              onSelect={() =>
                startTransition(() =>
                  updateAppointmentStatus(appointmentId, a.status),
                )
              }
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
