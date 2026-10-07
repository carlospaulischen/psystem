import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Charge } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function FinanceiroPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: charges } = await supabase
    .from("charges")
    .select("id, amount_cents, status, due_date, patient:patients(full_name)")
    .order("due_date", { ascending: false })
    .limit(50)
    .returns<(Charge & { patient: { full_name: string } | null })[]>();

  const totals = (charges ?? []).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + c.amount_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Financeiro</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {(["paid", "pending", "overdue"] as const).map((s) => (
          <div
            key={s}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-xs text-zinc-500">{STATUS_LABEL[s]}</p>
            <p className="mt-1 text-lg font-semibold">
              {formatBRL(totals[s] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
        {charges && charges.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {charges.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span>
                  {c.patient?.full_name ?? "—"}
                  <span className="ml-2 text-xs text-zinc-400">
                    {c.due_date
                      ? `vence ${new Date(c.due_date).toLocaleDateString("pt-BR")}`
                      : ""}
                  </span>
                </span>
                <span>
                  <span className="font-medium">{formatBRL(c.amount_cents)}</span>
                  <span className="ml-3 text-xs text-zinc-500">
                    {STATUS_LABEL[c.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            Nenhuma cobrança registrada.
          </p>
        )}
      </div>
    </div>
  );
}
