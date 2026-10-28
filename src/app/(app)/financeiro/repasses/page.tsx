import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

type PaymentRow = {
  amount_cents: number;
  paid_at: string | null;
  charge: {
    patient_id: string;
    appointment: { psychologist_id: string } | null;
  } | null;
};

type LinkRow = { patient_id: string; psychologist_id: string };

type MemberRow = {
  user_id: string;
  role: string;
  commission_pct: number | null;
  profile: { full_name: string } | null;
};

// Repasses: quanto do recebido no período fica com cada profissional,
// conforme o % definido em Configurações → Equipe.
export default async function RepassesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { profile } = await requireStaff();
  const { from, to } = await searchParams;
  const supabase = await createClient();

  const now = new Date();
  const rangeStart = from
    ? new Date(`${from}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeEnd = to
    ? new Date(`${to}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ data: payments }, { data: links }, { data: members }] =
    await Promise.all([
      supabase
        .from("payments")
        .select(
          "amount_cents, paid_at, charge:charges(patient_id, appointment:appointments(psychologist_id))",
        )
        .gte("paid_at", rangeStart.toISOString())
        .lt("paid_at", rangeEnd.toISOString())
        .returns<PaymentRow[]>(),
      supabase
        .from("patient_links")
        .select("patient_id, psychologist_id")
        .eq("status", "active")
        .returns<LinkRow[]>(),
      supabase
        .from("organization_members")
        .select(
          "user_id, role, commission_pct, profile:profiles!user_id(full_name)",
        )
        .eq("organization_id", profile.organization_id)
        .eq("role", "psychologist")
        .returns<MemberRow[]>(),
    ]);

  const linkByPatient = new Map(
    (links ?? []).map((l) => [l.patient_id, l.psychologist_id]),
  );

  // Atribui o pagamento ao psicólogo: primeiro pela consulta,
  // senão pelo vínculo ativo do paciente.
  const grossByPsych = new Map<string, number>();
  let unattributed = 0;
  for (const p of payments ?? []) {
    const charge = Array.isArray(p.charge) ? p.charge[0] : p.charge;
    const appointment = Array.isArray(charge?.appointment)
      ? charge?.appointment[0]
      : charge?.appointment;
    const psychId =
      appointment?.psychologist_id ??
      (charge ? linkByPatient.get(charge.patient_id) : undefined);
    if (!psychId) {
      unattributed += p.amount_cents;
      continue;
    }
    grossByPsych.set(psychId, (grossByPsych.get(psychId) ?? 0) + p.amount_cents);
  }

  const isAdmin = profile.is_org_admin === true;
  if (!isAdmin && profile.role !== "psychologist") redirect("/financeiro");

  const rows = (members ?? [])
    .filter((m) => isAdmin || m.user_id === profile.id)
    .map((m) => {
      const gross = grossByPsych.get(m.user_id) ?? 0;
      const pct = m.commission_pct;
      const share = pct !== null ? Math.round((gross * pct) / 100) : null;
      return { m, gross, pct, share };
    });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Repasses</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Recebido no período e a parte de cada profissional conforme o %
        configurado na equipe.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-2" action="/financeiro/repasses">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs text-muted-foreground">
            Recebido de
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
        <SubmitButton variant="outline" size="sm">Filtrar</SubmitButton>
      </form>

      <div className="mt-6 rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Repasse %</TableHead>
              <TableHead className="text-right">Ao profissional</TableHead>
              <TableHead className="text-right">À organização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ m, gross, pct, share }) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">
                  {m.profile?.full_name}
                  {m.user_id === profile.id && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (você)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(gross)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {pct !== null ? `${pct}%` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {share !== null ? formatBRL(share) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {share !== null ? formatBRL(gross - share) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {unattributed > 0 && (
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Sem atribuição
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(unattributed)}
                </TableCell>
                <TableCell colSpan={3} className="text-right text-xs text-muted-foreground">
                  cobranças sem consulta nem vínculo ativo
                </TableCell>
              </TableRow>
            )}
            {rows.length === 0 && unattributed === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum recebimento no período.
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
