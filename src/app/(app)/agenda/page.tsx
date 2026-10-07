import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Appointment } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  awaiting_confirmation: "Aguardando confirmação",
  confirmed: "Confirmada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Faltou",
  blocked: "Bloqueado",
};

export default async function AgendaPage() {
  await requireStaff();
  const supabase = await createClient();

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, modality, patient:patients(full_name)",
    )
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at")
    .returns<Appointment[]>();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agenda</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-500">Próximos 7 dias</p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
        {appointments && appointments.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">
                    {new Date(a.starts_at).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                    })}
                    {" · "}
                    {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {" — "}
                  {a.patient?.full_name ?? "Bloqueio"}
                  <span className="ml-2 text-xs text-zinc-400">
                    {a.modality === "online" ? "Online" : "Presencial"}
                  </span>
                </span>
                <span className="text-xs text-zinc-500">
                  {STATUS_LABEL[a.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            Nenhum agendamento nos próximos 7 dias.
          </p>
        )}
      </div>
    </div>
  );
}
