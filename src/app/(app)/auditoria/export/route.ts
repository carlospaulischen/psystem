import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exportação da trilha de auditoria — somente admin (mesmo escopo da página).
export async function GET() {
  const { profile } = await requireStaff();
  if (!profile.is_org_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select(
      "id, action, resource_type, created_at, user:profiles!user_id(full_name), patient:patients(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(5000)
    .returns<
      {
        id: number;
        action: string;
        resource_type: string;
        created_at: string;
        user: { full_name: string } | null;
        patient: { full_name: string } | null;
      }[]
    >();

  const rows = (data ?? []).map((l) =>
    [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.action,
      l.resource_type,
      l.user?.full_name ?? "sistema",
      l.patient?.full_name ?? "",
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "﻿" + ["Data;Acao;Recurso;Usuario;Paciente", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
