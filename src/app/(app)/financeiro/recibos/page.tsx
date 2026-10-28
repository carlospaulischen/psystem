import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type Row = {
  amount_cents: number;
  charge: { patient_id: string; patient: { full_name: string } | null } | null;
};

// Informe anual por paciente para IRPF — soma dos pagamentos recebidos
// no ano-calendário, com recibo em PDF para entregar ao paciente.
export default async function RecibosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  await requireStaff();
  const { ano } = await searchParams;
  const supabase = await createClient();

  const year = /^\d{4}$/.test(ano ?? "")
    ? Number(ano)
    : new Date().getFullYear();

  const { data: payments } = await supabase
    .from("payments")
    .select(
      "amount_cents, charge:charges(patient_id, patient:patients(full_name))",
    )
    .gte("paid_at", `${year}-01-01T00:00:00Z`)
    .lt("paid_at", `${year + 1}-01-01T00:00:00Z`)
    .returns<Row[]>();

  const byPatient = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  for (const p of payments ?? []) {
    const charge = Array.isArray(p.charge) ? p.charge[0] : p.charge;
    if (!charge) continue;
    const patient = Array.isArray(charge.patient)
      ? charge.patient[0]
      : charge.patient;
    const cur = byPatient.get(charge.patient_id) ?? {
      name: patient?.full_name ?? "—",
      total: 0,
      count: 0,
    };
    cur.total += p.amount_cents;
    cur.count += 1;
    byPatient.set(charge.patient_id, cur);
  }

  const rows = [...byPatient.entries()].sort((a, b) =>
    a[1].name.localeCompare(b[1].name),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Recibos anuais (IRPF)
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Totais recebidos por paciente no ano — gere o recibo em PDF para
        entregar a cada um.
      </p>

      <form className="mt-4 flex items-end gap-2" action="/financeiro/recibos">
        <div>
          <label htmlFor="ano" className="mb-1 block text-xs text-muted-foreground">
            Ano
          </label>
          <input
            id="ano"
            name="ano"
            type="number"
            min={2020}
            max={2100}
            defaultValue={year}
            className="h-9 w-28 rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </div>
        <SubmitButton variant="outline" size="sm">Filtrar</SubmitButton>
      </form>

      <div className="mt-6 rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-right">Pagamentos</TableHead>
              <TableHead className="text-right">Total recebido</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([patientId, r]) => (
              <TableRow key={patientId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(r.total)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/financeiro/recibos/${patientId}?ano=${year}`}
                    target="_blank"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <FileText className="size-3.5" />
                    Recibo
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum pagamento recebido em {year}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
          </div>
      </div>
    </div>
  );
}
