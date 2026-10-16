import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Patient, Profile } from "@/types";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paciente?: string }>;
}) {
  const { profile } = await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: patients }, { data: psychologists }, { data: rooms }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name")
        .eq("status", "active")
        .order("full_name")
        .returns<Pick<Patient, "id" | "full_name">[]>(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "psychologist")
        .eq("status", "active")
        .order("full_name")
        .returns<Pick<Profile, "id" | "full_name">[]>(),
      supabase
        .from("rooms")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .returns<{ id: string; name: string }[]>(),
    ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Novo agendamento
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O sistema bloqueia conflitos de horário do psicólogo e da sala.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Consulta</CardTitle>
          <CardDescription>
            Paciente, profissional, data e condições do atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAppointment} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kind">Tipo</Label>
              <select id="kind" name="kind" defaultValue="consultation" className={selectClass}>
                <option value="consultation">Consulta</option>
                <option value="block">Bloqueio de horário (almoço, reunião…)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Bloqueio ocupa o horário do psicólogo sem gerar consulta.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="patient_id">Paciente *</Label>
                <select
                  id="patient_id"
                  name="patient_id"
                  defaultValue={params.paciente ?? ""}
                  className={selectClass}
                >
                  <option value="">
                    — Somente para consulta —
                  </option>
                  {(patients ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="psychologist_id">Psicólogo *</Label>
                <select
                  id="psychologist_id"
                  name="psychologist_id"
                  required
                  defaultValue={
                    profile.role === "psychologist" ? profile.id : ""
                  }
                  className={selectClass}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {(psychologists ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="date">Data *</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Horário *</Label>
                <Input id="time" name="time" type="time" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration_min">Duração (min)</Label>
                <Input
                  id="duration_min"
                  name="duration_min"
                  type="number"
                  min={15}
                  step={5}
                  defaultValue={50}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="modality">Modalidade</Label>
                <select
                  id="modality"
                  name="modality"
                  defaultValue="in_person"
                  className={selectClass}
                >
                  <option value="in_person">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room_id">Sala</Label>
                <select id="room_id" name="room_id" className={selectClass}>
                  <option value="">—</option>
                  {(rooms ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Valor (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="200.00"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="meeting_link">Link da sala virtual</Label>
                <Input
                  id="meeting_link"
                  name="meeting_link"
                  type="url"
                  placeholder="https://meet.google.com/…"
                />
                <p className="text-xs text-muted-foreground">
                  Somente para consultas online — aparece no portal do paciente.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="admin_notes">Observação interna</Label>
                <Input
                  id="admin_notes"
                  name="admin_notes"
                  placeholder="Motivo do bloqueio, detalhes…"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="repeat_weeks">Recorrência semanal</Label>
              <select
                id="repeat_weeks"
                name="repeat_weeks"
                defaultValue="1"
                className={selectClass}
              >
                <option value="1">Não repetir</option>
                <option value="4">Repetir por 4 semanas</option>
                <option value="8">Repetir por 8 semanas</option>
                <option value="12">Repetir por 12 semanas</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Mesmo dia e horário a cada semana. Conflitos são pulados e
                reportados ao final.
              </p>
            </div>

            {params.error && (
              <p className="text-sm text-destructive">
                {params.error === "conflict"
                  ? "Conflito de agenda: o psicólogo ou a sala já têm compromisso nesse horário."
                  : "Preencha os campos obrigatórios."}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit">Agendar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
