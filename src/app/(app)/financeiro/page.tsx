import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Charge } from "@/types";

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
    .limit(100)
    .returns<(Charge & { patient: { full_name: string } | null })[]>();

  const totals = (charges ?? []).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + c.amount_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cobranças e recebimentos
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(["paid", "pending", "overdue"] as const).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardDescription>
                {s === "paid" ? "Recebido" : s === "pending" ? "Pendente" : "Vencido"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatBRL(totals[s] ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges && charges.length > 0 ? (
              charges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.patient?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.due_date
                      ? new Date(c.due_date).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(c.amount_cents)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma cobrança registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
