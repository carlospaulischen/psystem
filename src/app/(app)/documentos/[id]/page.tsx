import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { DOC_TYPE_LABEL } from "../page";
import {
  addDocumentVersion,
  deliverDocument,
  invalidateDocument,
  issueDocument,
  setDocumentReview,
} from "../actions";
import { buttonVariants } from "@/components/ui/button";
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

interface Version {
  version: number;
  content: string;
  issued_at: string | null;
  created_at: string;
}

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "*, patient:patients(full_name), appointment:appointments(starts_at, modality), versions:document_versions(version, content, issued_at, created_at), deliveries:document_deliveries(delivered_to, channel, delivered_at)",
    )
    .eq("id", id)
    .single();

  // RLS: fora do psicólogo responsável a linha nem existe → 404.
  if (!doc) notFound();

  const versions = (doc.versions as Version[]).sort(
    (a, b) => b.version - a.version,
  );
  const latest = versions[0];
  if (!latest) notFound();
  const editable = doc.status === "draft" || doc.status === "in_review";

  return (
    <div className="max-w-3xl">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Documentos
      </Link>

      <header className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {DOC_TYPE_LABEL[doc.type as keyof typeof DOC_TYPE_LABEL] ??
              doc.type}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {doc.patient?.full_name} · criado por {profile.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} />
          <Link
            href={`/documentos/${doc.id}/pdf`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Baixar PDF
          </Link>
        </div>
      </header>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finalidade e destino</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Finalidade</dt>
                <dd>{doc.purpose}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Destinatário</dt>
                <dd>
                  {doc.recipient_name ?? "—"}
                  {doc.recipient_service && ` (${doc.recipient_service})`}
                </dd>
              </div>
              {doc.appointment && (
                <div>
                  <dt className="text-muted-foreground">Atendimento</dt>
                  <dd>
                    {new Date(
                      doc.appointment.starts_at,
                    ).toLocaleString("pt-BR")}{" "}
                    ({doc.appointment.modality === "online"
                      ? "online"
                      : "presencial"}
                    )
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Conteúdo — v{latest.version}
              {latest.issued_at && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  emitida em{" "}
                  {new Date(latest.issued_at).toLocaleString("pt-BR")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {latest.content}
            </p>

            {versions.length > 1 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Versões anteriores ({versions.length - 1})
                </summary>
                <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
                  {versions.slice(1).map((v) => (
                    <li key={v.version}>
                      <p className="text-xs text-muted-foreground">
                        v{v.version} ·{" "}
                        {new Date(v.created_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground/80">
                        {v.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>

        {editable && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
              <CardDescription>
                Editar cria uma nova versão do conteúdo. Emitir congela o
                documento — depois disso ele não volta a rascunho.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  Editar conteúdo (nova versão)
                </summary>
                <form
                  action={addDocumentVersion.bind(
                    null,
                    doc.id,
                    doc.current_version,
                  )}
                  className="mt-3 grid gap-3 border-t pt-3"
                >
                  <Textarea
                    name="content"
                    rows={10}
                    required
                    defaultValue={latest.content}
                  />
                  <div className="flex justify-end">
                    <SubmitButton variant="outline" size="sm">
                      Salvar como v{doc.current_version + 1}
                    </SubmitButton>
                  </div>
                </form>
              </details>

              <div className="flex items-center justify-between gap-3">
                <form
                  action={setDocumentReview.bind(
                    null,
                    doc.id,
                    doc.status === "draft",
                  )}
                >
                  <SubmitButton variant="outline" size="sm">
                    {doc.status === "draft"
                      ? "Marcar em revisão"
                      : "Voltar a rascunho"}
                  </SubmitButton>
                </form>
                <form
                  action={issueDocument.bind(null, doc.id, latest.content)}
                >
                  <SubmitButton>Emitir documento</SubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {doc.status === "issued" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entrega</CardTitle>
              <CardDescription>
                Registre para quem e por qual canal o documento foi entregue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                action={deliverDocument.bind(null, doc.id)}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <div className="grid gap-2">
                  <Label htmlFor="delivered_to">Entregue a</Label>
                  <Input
                    id="delivered_to"
                    name="delivered_to"
                    required
                    placeholder="Nome ou e-mail"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel">Canal</Label>
                  <Input
                    id="channel"
                    name="channel"
                    required
                    placeholder="ex.: portal, e-mail, impresso"
                  />
                </div>
                <SubmitButton>Registrar entrega</SubmitButton>
              </form>

              <form
                action={invalidateDocument.bind(null, doc.id)}
                className="border-t pt-4"
              >
                <SubmitButton variant="outline" size="sm">
                  Invalidar documento
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        )}

        {doc.deliveries && doc.deliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {doc.deliveries.map(
                  (d: {
                    delivered_to: string;
                    channel: string;
                    delivered_at: string;
                  }) => (
                    <li
                      key={d.delivered_at}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span>
                        {d.delivered_to}
                        <span className="ml-2 text-muted-foreground">
                          via {d.channel}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.delivered_at).toLocaleString("pt-BR")}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
