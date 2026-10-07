import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Appointment, Charge } from "@/types";

// Portal do paciente — acesso apenas ao próprio contexto via RLS
// (is_patient_portal_user). Sem qualquer dado clínico (ET-002).
export const instant = false;

export default async function PortalPage() {
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
    <main className="mx-auto max-w-2xl flex-1 p-8">
      <h1 className="text-2xl font-semibold">Meu portal</h1>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-medium">Próximas consultas</h2>
        {appointments && appointments.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {appointments.map((a) => (
              <li key={a.id}>
                {new Date(a.starts_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                {a.modality === "online" ? "Online" : "Presencial"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhuma consulta agendada.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-medium">Pagamentos</h2>
        {charges && charges.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {charges.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>
                  {(c.amount_cents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
                <span className="text-zinc-500">{c.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhuma cobrança no momento.
          </p>
        )}
      </section>
    </main>
  );
}
