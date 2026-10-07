import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Appointment, Charge } from "@/types";

// Portal do paciente — acesso apenas ao próprio contexto via RLS
// (is_patient_portal_user). Sem qualquer dado clínico (ET-002).
export const instant = false;

export default async function PortalPage() {
  await connection(); // new Date() abaixo é dado de runtime (Next 16)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const [{ data: appointments }, { data: charges }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, modality")
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
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Meu portal</h1>

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
              Nenhuma consulta agendada.
            </p>
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
    </main>
  );
}
