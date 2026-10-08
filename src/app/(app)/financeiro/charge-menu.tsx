"use client";

import { EllipsisVertical } from "lucide-react";
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
  if (!open) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Ações" />}
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => markChargePaid(chargeId)}>
          Marcar como pago
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive"
          onSelect={() => cancelCharge(chargeId)}
        >
          Cancelar cobrança
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
