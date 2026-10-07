"use client";

import { EllipsisVertical } from "lucide-react";
import { updateMemberStatus } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function MemberActions({
  memberId,
  status,
}: {
  memberId: string;
  status: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Ações" />}
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status !== "active" && (
          <DropdownMenuItem
            onSelect={() => updateMemberStatus(memberId, "active")}
          >
            Ativar acesso
          </DropdownMenuItem>
        )}
        {status === "active" && (
          <DropdownMenuItem
            onSelect={() => updateMemberStatus(memberId, "inactive")}
          >
            Desativar acesso
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive"
          onSelect={() => updateMemberStatus(memberId, "blocked")}
        >
          Bloquear acesso
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
