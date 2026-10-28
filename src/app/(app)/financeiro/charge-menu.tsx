"use client";

import { useTransition } from "react";
import { EllipsisVertical, Loader2 } from "lucide-react";
import { cancelCharge, markChargePaid } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ChargeMenu({
  chargeId,
  status,
}: {
  chargeId: string;
  status: string;
}) {
  const open = status === "pending" || status === "overdue";
  const [pending, startTransition] = useTransition();
  if (!open) return null;

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
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => startTransition(() => markChargePaid(chargeId))}
        >
          Marcar como pago
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          disabled={pending}
          onSelect={() => startTransition(() => cancelCharge(chargeId))}
        >
          Cancelar cobrança
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
