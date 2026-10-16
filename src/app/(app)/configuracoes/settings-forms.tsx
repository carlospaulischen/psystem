"use client";

import { useActionState } from "react";
import {
  updateMyProfile,
  updateOrganization,
  updateSchedulingPolicy,
  type InviteState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationForm({
  org,
}: {
  org: {
    name: string;
    document: string | null;
    settings: Record<string, string | null>;
  };
}) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    updateOrganization,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="org_name">Nome</Label>
        <Input
          id="org_name"
          name="name"
          required
          defaultValue={org.name}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="org_document">CNPJ / CPF</Label>
          <Input
            id="org_document"
            name="document"
            defaultValue={org.document ?? ""}
            placeholder="Necessário para NFS-e"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="org_phone">Telefone</Label>
          <Input
            id="org_phone"
            name="phone"
            defaultValue={org.settings?.phone ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="org_address">Endereço</Label>
          <Input
            id="org_address"
            name="address"
            defaultValue={org.settings?.address ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="org_city">Cidade/UF</Label>
          <Input
            id="org_city"
            name="city"
            defaultValue={org.settings?.city ?? ""}
            placeholder="São Paulo/SP"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">Dados salvos.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar organização"}
        </Button>
      </div>
    </form>
  );
}

export function ProfileForm({
  profile,
}: {
  profile: { full_name: string; crp: string | null; role: string };
}) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    updateMyProfile,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="my_name">Nome</Label>
          <Input
            id="my_name"
            name="full_name"
            required
            defaultValue={profile.full_name}
          />
        </div>
        {profile.role === "psychologist" && (
          <div className="grid gap-2">
            <Label htmlFor="my_crp">CRP</Label>
            <Input
              id="my_crp"
              name="crp"
              defaultValue={profile.crp ?? ""}
              placeholder="CRP 06/12345"
            />
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">Perfil atualizado.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}

const checkClass =
  "size-4 rounded border-input accent-primary";

// Política de reagendamento — vale para a organização ativa
// (o mesmo profissional pode ter regras diferentes em cada org).
export function SchedulingPolicyForm({
  policy,
}: {
  policy: {
    reschedule_enabled: boolean;
    reschedule_min_hours: number;
    reschedule_within_availability: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    updateSchedulingPolicy,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={policy.reschedule_enabled}
          className={checkClass}
        />
        Permitir que a recepção/administração remarque minhas consultas
      </label>

      <div className="grid gap-2 sm:max-w-56">
        <Label htmlFor="min_hours">Antecedência mínima (horas)</Label>
        <Input
          id="min_hours"
          name="min_hours"
          type="number"
          min={0}
          max={720}
          defaultValue={policy.reschedule_min_hours}
        />
        <p className="text-xs text-muted-foreground">
          0 = sem limite. Ex.: 24 impede remarcação a menos de 24h da consulta.
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="within_availability"
          defaultChecked={policy.reschedule_within_availability}
          className={checkClass}
        />
        Só permitir reagendamento dentro dos meus horários de atendimento
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-600">Política atualizada.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar política"}
        </Button>
      </div>
    </form>
  );
}
