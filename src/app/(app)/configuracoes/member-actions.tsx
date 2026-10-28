"use client";

import { useTransition } from "react";
import { EllipsisVertical, Loader2 } from "lucide-react";
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
        {status !== "active" && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              startTransition(() => updateMemberStatus(memberId, "active"))
            }
          >
            Ativar acesso
          </DropdownMenuItem>
        )}
        {status === "active" && (
          <DropdownMenuItem
            disabled={pending}
            onSelect={() =>
              startTransition(() => updateMemberStatus(memberId, "inactive"))
            }
          >
            Desativar acesso
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive"
          disabled={pending}
          onSelect={() =>
            startTransition(() => updateMemberStatus(memberId, "blocked"))
          }
        >
          Bloquear acesso
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
