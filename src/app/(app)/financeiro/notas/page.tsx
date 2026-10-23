import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { approveInvoice } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const INVOICE_STATUS_LABEL: Record<string, string> = {
  awaiting_review: "Aguardando revisão",
  approved: "Aprovada — aguardando emissão",
  requested: "Solicitada",
  processing: "Em processamento",
  issued: "Emitida",
  failed: "Falhou",
  cancelled: "Cancelada",
};

interface InvoiceRow {
  id: string;
  status: string;
  created_at: string;
  review_deadline: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  charge: {
    amount_cents: number;
    due_date: string | null;
    patient: { full_name: string } | null;
    appointment: { starts_at: string; modality: string } | null;
  } | null;
}

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();
  const canApprove = profile.role !== "receptionist";

  const [{ data: invoices }, { data: org }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, status, created_at, review_deadline, reviewed_at, sent_at, charge:charges(amount_cents, due_date, patient:patients(full_name), appointment:appointments(starts_at, modality))",
      )
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<InvoiceRow[]>(),
    supabase
      .from("organizations")
      .select("name, document, settings")
      .eq("id", profile.organization_id)
      .single(),
  ]);

  const pending = (invoices ?? []).filter(
    (i) => i.status === "awaiting_review",
  );
  const history = (invoices ?? []).filter(
    (i) => i.status !== "awaiting_review",
  );

  return (
    <div className="max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notas fiscais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada pagamento gera uma nota em pré-emissão. Revise os dados e
          autorize explicitamente — nenhuma nota sai sem a sua confirmação.
        </p>
      </header>

      {params.error === "confirm" && (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Marque a confirmação de revisão para autorizar a nota.
        </p>
      )}

      <section className="mt-6 space-y-4">
        {pending.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma nota aguardando revisão.
            </CardContent>
          </Card>
        ) : (
          pending.map((inv) => {
            const deadline = inv.review_deadline
              ? new Date(inv.review_deadline)
              : null;
            const overdue = deadline ? deadline < new Date() : false;
            const service = inv.charge?.appointment
              ? `Atendimento psicológico — ${new Date(
                  inv.charge.appointment.starts_at,
                ).toLocaleDateString("pt-BR")} (${
                  inv.charge.appointment.modality === "online"
                    ? "online"
                    : "presencial"
                })`
              : "Atendimento psicológico";

            return (
              <Card key={inv.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">
                      Prévia da nota fiscal
                    </CardTitle>
                    <StatusBadge status="awaiting_confirmation" />
                  </div>
                  <CardDescription>
                    {deadline && (
                      <>
                        Prazo para validar:{" "}
                        <span
                          className={
                            overdue ? "font-medium text-destructive" : ""
                          }
                        >
                          {deadline.toLocaleDateString("pt-BR")}
                          {overdue ? " (vencido)" : ""}
                        </span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prévia dos dados que irão na nota */}
                  <dl className="grid gap-x-8 gap-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Emissor</dt>
                      <dd>
                        {org?.name}
                        {org?.document && (
                          <span className="ml-1 text-muted-foreground">
                            · {org.document}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Tomador (paciente)
                      </dt>
                      <dd>{inv.charge?.patient?.full_name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Serviço</dt>
                      <dd>{service}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Valor</dt>
                      <dd className="font-medium tabular-nums">
                        {brl(inv.charge?.amount_cents ?? 0)}
                      </dd>
                    </div>
                  </dl>

                  {canApprove ? (
                    <form
                      action={approveInvoice.bind(null, inv.id)}
                      className="space-y-3"
                    >
                      <label className="flex items-start gap-2.5 text-sm">
                        <input
                          type="checkbox"
                          name="confirmed"
                          required
                          className="mt-0.5 size-4 rounded border-input accent-primary"
                        />
                        Revisei os dados acima e autorizo a emissão e o envio
                        desta nota fiscal ao paciente.
                      </label>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">
                          Aprovar e autorizar envio
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      A aprovação de notas fiscais é restrita ao profissional
                      ou à administração.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">
            Histórico
          </h2>
          <Card className="mt-3">
            <CardContent className="p-0">
              <ul className="divide-y divide-border text-sm">
                {history.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {inv.charge?.patient?.full_name ?? "—"}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {brl(inv.charge?.amount_cents ?? 0)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {inv.reviewed_at &&
                          `aprovada em ${new Date(
                            inv.reviewed_at,
                          ).toLocaleString("pt-BR")}`}
                        {inv.sent_at &&
                          ` · enviada em ${new Date(
                            inv.sent_at,
                          ).toLocaleString("pt-BR")}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {INVOICE_STATUS_LABEL[inv.status] ?? inv.status}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
