import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import {
  createAccessRequest,
  confirmAppointment,
  requestAppointment,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Appointment, Charge } from "@/types";

// Portal do paciente — acesso apenas ao próprio contexto via RLS
// (is_patient_portal_user). Sem qualquer dado clínico (ET-002).
export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const [
    { data: appointments },
    { data: charges },
    { data: requests },
    { data: apptRequests },
  ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, starts_at, status, modality, meeting_link")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(10)
        .returns<Appointment[]>(),
      supabase
        .from("charges")
        .select("id, amount_cents, status, due_date")
        .order("due_date", { ascending: false })
        .limit(10)
        .returns<Charge[]>(),
      supabase
        .from("access_requests")
        .select("id, request_type, status, note, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("appointment_requests")
        .select("id, preferred_starts_at, status, note, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-center gap-3">
        <Image
          src="/brand/psystem/logo-horizontal.png"
          alt="PSYSTEM"
          width={463}
          height={145}
          className="h-10 w-auto"
        />
        <h1 className="text-2xl font-semibold tracking-tight">Meu portal</h1>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Próximas consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 py-2.5"
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
                    {a.modality === "online" && a.meeting_link && (
                      <a
                        href={a.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        Entrar na sala
                      </a>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={a.status} />
                    {["scheduled", "awaiting_confirmation"].includes(
                      a.status,
                    ) && (
                      <form action={confirmAppointment.bind(null, a.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          Confirmar
                        </Button>
                      </form>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhuma consulta agendada.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Solicitar horário</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={requestAppointment} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="req-date">Data</Label>
                <Input id="req-date" name="date" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="req-time">Horário</Label>
                <Input id="req-time" name="time" type="time" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="req-note">Observação</Label>
              <Input
                id="req-note"
                name="note"
                placeholder="Preferência de dia ou período (opcional)"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Pedir horário
              </Button>
            </div>
          </form>

          {apptRequests && apptRequests.length > 0 && (
            <ul className="mt-4 divide-y divide-border border-t text-sm">
              {apptRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span>
                    {new Date(r.preferred_starts_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {charges && charges.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {charges.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="tabular-nums">
                    {(c.amount_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhuma cobrança no momento.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Solicitar documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAccessRequest} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="request_type">Tipo de documento</Label>
              <select
                id="request_type"
                name="request_type"
                required
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="declaration">Declaração</option>
                <option value="certificate">Atestado</option>
                <option value="report">Relatório</option>
                <option value="document">Outro documento</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Período</Label>
              <Input
                id="period"
                name="period"
                placeholder="ex.: últimos 3 meses (opcional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Observação</Label>
              <Textarea
                id="note"
                name="note"
                rows={2}
                placeholder="Para que você precisa do documento?"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Enviar solicitação
              </Button>
            </div>
          </form>

          {requests && requests.length > 0 && (
            <ul className="mt-4 divide-y divide-border border-t text-sm">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span>
                    {r.request_type}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
