import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { ChargeMenu } from "./charge-menu";
import { buttonVariants } from "@/components/ui/button";
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

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireStaff();
  const { from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("charges")
    .select("id, amount_cents, status, due_date, patient:patients(full_name)")
    .order("due_date", { ascending: false })
    .limit(200);
  if (from) query = query.gte("due_date", from);
  if (to) query = query.lte("due_date", to);

  const { data: charges } = await query.returns<
    (Charge & { patient: { full_name: string } | null })[]
  >();

  const totals = (charges ?? []).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + c.amount_cents;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cobranças e recebimentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/financeiro/repasses"
            className={buttonVariants({ variant: "outline" })}
          >
            Repasses
          </Link>
          <Link
            href="/financeiro/recibos"
            className={buttonVariants({ variant: "outline" })}
          >
            Recibos IRPF
          </Link>
          <Link
            href={`/financeiro/export${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString()}` : ""}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="size-4" />
            CSV
          </Link>
          <Link href="/financeiro/nova" className={buttonVariants()}>
            <Plus className="size-4" />
            Nova cobrança
          </Link>
        </div>
      </header>

      <form className="mt-4 flex flex-wrap items-end gap-2" action="/financeiro">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs text-muted-foreground">
            Vencimento de
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs text-muted-foreground">
            até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Filtrar
        </button>
      </form>

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
              <TableHead className="w-10" />
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
                  <TableCell>
                    <ChargeMenu chargeId={c.id} status={c.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
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
