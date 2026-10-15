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
import { invitePatientPortal, uploadAttachment, deleteAttachment } from "../actions";
import { Paperclip, Trash2, Upload } from "lucide-react";
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
    { data: attachments },
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
      supabase
        .from("patient_attachments")
        .select("id, file_name, file_path, size_bytes, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const responsible = patient.links?.find(
    (l: { status: string }) => l.status === "active",
  );

  // URLs assinadas (1h) para download — bucket é privado.
  const attachmentsWithUrl = await Promise.all(
    (attachments ?? []).map(async (att) => {
      const { data } = await supabase.storage
        .from("patient-files")
        .createSignedUrl(att.file_path, 3600);
      return { ...att, url: data?.signedUrl ?? null };
    }),
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
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
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
                <div>
                  <dt className="text-muted-foreground">Consentimento LGPD</dt>
                  <dd>
                    {patient.consent_at
                      ? `Assinado em ${new Date(patient.consent_at).toLocaleDateString("pt-BR")} (${patient.consent_version ?? "v1"})`
                      : "Não registrado"}
                  </dd>
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

        <TabsContent value="anexos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Anexos</CardTitle>
              <CardDescription>
                Documentos enviados, autorizações e arquivos administrativos.
                Armazenamento privado por organização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={uploadAttachment.bind(null, patient.id)}
                className="mb-4 flex items-center gap-2"
              >
                <input
                  type="file"
                  name="file"
                  required
                  className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Upload className="size-4" />
                  Enviar
                </Button>
              </form>

              {attachmentsWithUrl.length > 0 ? (
                <ul className="divide-y divide-border text-sm">
                  {attachmentsWithUrl.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                        {att.url ? (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate font-medium hover:text-primary hover:underline"
                          >
                            {att.file_name}
                          </a>
                        ) : (
                          <span className="truncate font-medium">
                            {att.file_name}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {att.size_bytes
                            ? `${(att.size_bytes / 1024).toFixed(0)} KB`
                            : ""}
                          {" · "}
                          {new Date(att.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </span>
                      <form
                        action={deleteAttachment.bind(null, att.id, patient.id)}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  Nenhum anexo enviado.
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
