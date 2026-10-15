import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updatePatient } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function EditarPacientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const guardian = (patient.guardian ?? {}) as {
    full_name?: string;
    phone?: string;
    kinship?: string;
  };

  const action = updatePatient.bind(null, patient.id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Editar paciente
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {patient.full_name} — dados administrativos.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
          <CardDescription>
            Informações de contato do paciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                name="full_name"
                required
                defaultValue={patient.full_name}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  placeholder="000.000.000-00"
                  defaultValue={patient.cpf ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  defaultValue={patient.birth_date ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={patient.phone ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={patient.email ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Responsável legal (menores de idade)</Label>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  name="guardian_name"
                  placeholder="Nome"
                  defaultValue={guardian.full_name ?? ""}
                />
                <Input
                  name="guardian_phone"
                  placeholder="Telefone"
                  defaultValue={guardian.phone ?? ""}
                />
                <Input
                  name="guardian_kinship"
                  placeholder="Parentesco"
                  defaultValue={guardian.kinship ?? ""}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                defaultChecked={!!patient.consent_at}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="font-medium">Termo de consentimento LGPD</span>
                <span className="block text-xs text-muted-foreground">
                  O paciente autorizou o tratamento dos dados pessoais
                  conforme a política de privacidade.
                  {patient.consent_at &&
                    ` Registrado em ${new Date(patient.consent_at).toLocaleDateString("pt-BR")} (${patient.consent_version ?? "v1"}).`}
                </span>
              </span>
            </label>

            <div className="grid gap-2">
              <Label htmlFor="admin_notes">Observações administrativas</Label>
              <Textarea
                id="admin_notes"
                name="admin_notes"
                rows={3}
                placeholder="Apenas informações administrativas — nunca dados clínicos."
                defaultValue={patient.admin_notes ?? ""}
              />
            </div>

            {sp.error && (
              <p className="text-sm text-destructive">
                {sp.error === "required"
                  ? "Informe o nome do paciente."
                  : "Não foi possível salvar. Tente novamente."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
