import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants, Button } from "@/components/ui/button";
import { ClinicalRecordPanel } from "./clinical-record-panel";
import { PatientActions } from "./patient-actions";
import { invitePatientPortal } from "../actions";
import type { Appointment, Charge } from "@/types";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select(
      "*, links:patient_links(status, psychologist:profiles!psychologist_id(full_name))",
    )
    .eq("id", id)
    .single();

  if (!patient) notFound();

  const [
    { data: appointments },
    { data: charges },
    { data: record },
    { data: portalAccount },
  ] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, status, modality")
        .eq("patient_id", id)
        .order("starts_at", { ascending: false })
        .limit(20)
        .returns<Appointment[]>(),
      supabase
        .from("charges")
        .select("id, amount_cents, status, due_date")
        .eq("patient_id", id)
        .order("due_date", { ascending: false })
        .limit(20)
        .returns<Charge[]>(),
      // RLS retorna a linha apenas se o usuário for o psicólogo responsável.
      supabase
        .from("clinical_records")
        .select("id, status")
        .eq("patient_id", id)
        .maybeSingle(),
      supabase
        .from("patient_accounts")
        .select("patient_id")
        .eq("patient_id", id)
        .maybeSingle(),
    ]);

  const responsible = patient.links?.find(
    (l: { status: string }) => l.status === "active",
  );

  return (
    <div>
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Pacientes
      </Link>

      <header className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {patient.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {responsible
              ? `Responsável: ${responsible.psychologist?.full_name}`
              : "Sem psicólogo vinculado"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {portalAccount ? (
            <StatusBadge status="portal_active" />
          ) : (
            patient.email && (
              <form action={invitePatientPortal.bind(null, patient.id)}>
                <Button type="submit" variant="outline" size="sm">
                  Convidar para o portal
                </Button>
              </form>
            )
          )}
          <StatusBadge status={patient.status} />
          <Link
            href={`/pacientes/${patient.id}/editar`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Editar
          </Link>
          <PatientActions patientId={patient.id} status={patient.status} />
        </div>
      </header>

      <Tabs defaultValue="dados" className="mt-6">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados administrativos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">CPF</dt>
                  <dd>{patient.cpf ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Nascimento</dt>
                  <dd>
                    {patient.birth_date
                      ? new Date(patient.birth_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd>{patient.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd>{patient.email ?? "—"}</dd>
                </div>
                {patient.admin_notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">
                      Observações administrativas
                    </dt>
                    <dd>{patient.admin_notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultas</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments && appointments.length > 0 ? (
                <ul className="divide-y divide-border text-sm">
                  {appointments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span>
                        {new Date(a.starts_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="ml-2 text-muted-foreground">
                          {a.modality === "online" ? "Online" : "Presencial"}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhuma consulta registrada.
                </p>
              )}
              <Link
                href={`/agenda/novo?paciente=${patient.id}`}
                className={buttonVariants({ variant: "outline", className: "mt-4" })}
              >
                Agendar consulta
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cobranças</CardTitle>
            </CardHeader>
            <CardContent>
              {charges && charges.length > 0 ? (
                <ul className="divide-y divide-border text-sm">
                  {charges.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span>
                        {formatBRL(c.amount_cents)}
                        {c.due_date && (
                          <span className="ml-2 text-muted-foreground">
                            vence{" "}
                            {new Date(c.due_date).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </span>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhuma cobrança registrada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prontuario" className="mt-4">
          {/* ET-002/008: RLS já bloqueia no banco; aqui controlamos a UI. */}
          {profile.role === "psychologist" && record ? (
            <ClinicalRecordPanel
              recordId={record.id}
              patientId={patient.id}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prontuário</CardTitle>
                <CardDescription>
                  Conteúdo clínico acessível apenas ao psicólogo responsável
                  pelo paciente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {profile.role !== "psychologist"
                    ? "Seu perfil não possui acesso a informações clínicas."
                    : "Você não é o psicólogo responsável por este paciente."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
