"use client";

import { useActionState } from "react";
import { inviteStaff, type InviteState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    inviteStaff,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="pessoa@clinica.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="role">Função</Label>
          <Select name="role" required>
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="psychologist">Psicólogo(a)</SelectItem>
              <SelectItem value="receptionist">Recepção</SelectItem>
              <SelectItem value="clinic_admin">Administração</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="crp">CRP</Label>
          <Input id="crp" name="crp" placeholder="Obrigatório p/ psicólogo" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">
          Convite enviado. O membro aparece na lista como &quot;Convite
          enviado&quot;.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar convite"}
        </Button>
      </div>
    </form>
  );
}
