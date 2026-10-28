import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createPatient } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";
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
import type { Profile } from "@/types";

export default async function NovoPacientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();

  const { data: psychologists } = await supabase
    .from("profiles")
    .select("id, full_name, crp")
    .in("role", ["psychologist", "clinic_admin"])
    .eq("status", "active")
    .order("full_name")
    .returns<Pick<Profile, "id" | "full_name" | "crp">[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Novo paciente</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Dados administrativos do cadastro.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
          <CardDescription>
            Informações de contato e responsável pelo atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPatient} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input id="full_name" name="full_name" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" name="cpf" placeholder="000.000.000-00" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="guardian_name">
                  Responsável (opcional)
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    id="guardian_name"
                    name="guardian_name"
                    placeholder="Nome — ex.: mãe do paciente"
                  />
                  <Input
                    id="guardian_cpf"
                    name="guardian_cpf"
                    placeholder="CPF do responsável"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Para menores/tutelados: é o responsável que sai na nota e
                  no recibo, não o paciente.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birth_date">Data de nascimento</Label>
                <Input id="birth_date" name="birth_date" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input id="phone" name="phone" placeholder="(00) 90000-0000" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="psychologist_id">Psicólogo responsável</Label>
              <select
                id="psychologist_id"
                name="psychologist_id"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Definir depois</option>
                {(psychologists ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                    {p.crp ? ` — ${p.crp}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                O vínculo define quem acessa o prontuário do paciente.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin_notes">Observações administrativas</Label>
              <Textarea
                id="admin_notes"
                name="admin_notes"
                rows={3}
                placeholder="Apenas informações administrativas — nunca dados clínicos."
              />
            </div>

            {params.error && (
              <p className="text-sm text-destructive">
                {params.error === "required"
                  ? "Informe o nome do paciente."
                  : "Não foi possível salvar. Tente novamente."}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <SubmitButton>Cadastrar paciente</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
