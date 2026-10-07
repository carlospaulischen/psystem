import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Appointment, Charge } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  awaiting_confirmation: "Aguardando confirmação",
  confirmed: "Confirmada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Faltou",
  blocked: "Bloqueado",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function DashboardPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [{ data: appointments }, { data: pendingCharges }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, patient:patients(full_name)")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at")
      .returns<Appointment[]>(),
    supabase
      .from("charges")
      .select("amount_cents, status")
      .in("status", ["pending", "overdue"])
      .returns<Pick<Charge, "amount_cents" | "status">[]>(),
  ]);

  const pendingTotal = (pendingCharges ?? []).reduce(
    (sum, c) => sum + c.amount_cents,
    0,
  );
  const overdueCount = (pendingCharges ?? []).filter(
    (c) => c.status === "overdue",
  ).length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">
        Olá, {profile.full_name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Agenda de hoje</h2>
          {appointments && appointments.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-100">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{formatTime(a.starts_at)}</span>
                    {" — "}
                    {a.patient?.full_name ?? "Bloqueio"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {STATUS_LABEL[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum atendimento hoje.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Pendências</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span className="font-medium">{formatBRL(pendingTotal)}</span> em
              cobranças em aberto
            </li>
            <li>
              <span className="font-medium">{overdueCount}</span> cobrança(s)
              vencida(s)
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
