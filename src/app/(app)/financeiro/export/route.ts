import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

// Exportação CSV das cobranças — separador ';' (Excel pt-BR).
export async function GET(request: NextRequest) {
  await requireStaff();
  const supabase = await createClient();

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = supabase
    .from("charges")
    .select("amount_cents, status, due_date, created_at, patient:patients(full_name)")
    .order("due_date", { ascending: false })
    .limit(2000);

  if (from) query = query.gte("due_date", from);
  if (to) query = query.lte("due_date", to);

  const { data } = await query.returns<
    {
      amount_cents: number;
      status: string;
      due_date: string | null;
      created_at: string;
      patient: { full_name: string } | null;
    }[]
  >();

  const rows = (data ?? []).map((c) =>
    [
      c.patient?.full_name ?? "",
      c.due_date ?? "",
      (c.amount_cents / 100).toFixed(2).replace(".", ","),
      STATUS_PT[c.status] ?? c.status,
      new Date(c.created_at).toLocaleDateString("pt-BR"),
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "﻿" + ["Paciente;Vencimento;Valor (R$);Status;Criada em", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cobrancas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
