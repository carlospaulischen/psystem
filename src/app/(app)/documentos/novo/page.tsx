import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDocument } from "../actions";
import { DOC_TYPE_LABEL } from "../page";
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

export default async function NovoDocumentoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paciente?: string }>;
}) {
  const { profile } = await requireStaff();
  if (profile.role !== "psychologist") redirect("/documentos");

  const params = await searchParams;
  const supabase = await createClient();

  // Apenas pacientes com vínculo ativo com o psicólogo logado.
  const { data: links } = await supabase
    .from("patient_links")
    .select("patient:patients(id, full_name)")
    .eq("psychologist_id", profile.id)
    .eq("status", "active")
    .returns<{ patient: { id: string; full_name: string } | null }[]>();

  const patients = (links ?? [])
    .map((l) => l.patient)
    .filter((p): p is { id: string; full_name: string } => !!p)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Novo documento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O documento nasce como rascunho e pode ser revisado antes da emissão.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
          <CardDescription>
            Finalidade é obrigatória — documentos psicológicos sempre
            indicam para que servem e a quem se destinam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDocument} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="patient_id">Paciente *</Label>
                <select
                  id="patient_id"
                  name="patient_id"
                  required
                  defaultValue={params.paciente ?? ""}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Tipo *</Label>
                <select
                  id="type"
                  name="type"
                  required
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="purpose">Finalidade *</Label>
              <Input
                id="purpose"
                name="purpose"
                required
                placeholder="ex.: declaração de acompanhamento para a escola"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="recipient_name">Destinatário</Label>
                <Input
                  id="recipient_name"
                  name="recipient_name"
                  placeholder="Nome do profissional/órgão"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recipient_service">Serviço</Label>
                <Input
                  id="recipient_service"
                  name="recipient_service"
                  placeholder="ex.: Psiquiatria, escola, RH"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea id="content" name="content" rows={10} required />
              <p className="text-xs text-muted-foreground">
                Emita apenas o necessário à finalidade — evite dados clínicos
                desnecessários (ET-009).
              </p>
            </div>

            {params.error && (
              <p className="text-sm text-destructive">
                {params.error === "required"
                  ? "Preencha paciente, tipo, finalidade e conteúdo."
                  : "Não foi possível salvar. Verifique se você é o psicólogo responsável."}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit">Salvar rascunho</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
