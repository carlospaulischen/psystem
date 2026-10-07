"use client";

import { useActionState } from "react";
import { addRecordVersion, type VersionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VersionForm({
  entryId,
  patientId,
}: {
  entryId: string;
  patientId: string;
}) {
  const action = addRecordVersion.bind(null, entryId, patientId);
  const [state, formAction, pending] = useActionState<VersionState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="mt-3 grid gap-3 border-t pt-3">
      <div className="grid gap-2">
        <Label htmlFor={`content-${entryId}`}>Novo conteúdo</Label>
        <Textarea id={`content-${entryId}`} name="content" rows={4} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`procedures-${entryId}`}>Procedimentos</Label>
        <Textarea id={`procedures-${entryId}`} name="procedures" rows={2} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`reason-${entryId}`}>Motivo da alteração *</Label>
        <Input
          id={`reason-${entryId}`}
          name="change_reason"
          required
          placeholder="ex.: complemento do registro, correção de informação"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar nova versão"}
        </Button>
      </div>
    </form>
  );
}
