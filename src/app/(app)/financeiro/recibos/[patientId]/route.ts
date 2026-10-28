import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderBrandedPdf } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ patientId: string }>;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Recibo anual para IRPF: soma dos pagamentos do paciente no ano,
// emitido em nome da organização (CNPJ/CPF próprio — multi-org resolve
// quem é o emissor por construção).
export async function GET(request: Request, { params }: RouteParams) {
  const { profile } = await requireStaff();
  const { patientId } = await params;
  const { searchParams } = new URL(request.url);
  const year = /^\d{4}$/.test(searchParams.get("ano") ?? "")
    ? Number(searchParams.get("ano"))
    : new Date().getFullYear();
  const supabase = await createClient();

  const [{ data: patient }, { data: org }, { data: link }, { data: payments }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("full_name, guardian")
        .eq("id", patientId)
        .single(),
      supabase
        .from("organizations")
        .select("name, document, settings")
        .eq("id", profile.organization_id)
        .single(),
      supabase
        .from("patient_links")
        .select("psychologist:profiles!psychologist_id(full_name, crp)")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("payments")
        .select("amount_cents, paid_at, charge:charges!inner(patient_id)")
        .eq("charges.patient_id", patientId)
        .gte("paid_at", `${year}-01-01T00:00:00Z`)
        .lt("paid_at", `${year + 1}-01-01T00:00:00Z`)
        .returns<{ amount_cents: number; paid_at: string | null }[]>(),
    ]);

  if (!patient || !org) notFound();

  const total = (payments ?? []).reduce((s, p) => s + p.amount_cents, 0);
  if (total === 0) notFound();

  const psychologist = Array.isArray(link?.psychologist)
    ? link?.psychologist[0]
    : link?.psychologist;
  const settings = (org.settings as Record<string, string | null>) ?? {};

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "payment",
    resourceId: patientId,
    action: "RECIBO_IRPF",
    patientId,
    metadata: { year, total_cents: total },
  });

  const pdf = await renderBrandedPdf({
    title: "Recibo de pagamento",
    subtitle: `${org.name}${org.document ? ` · CNPJ/CPF ${org.document}` : ""}`,
    sections: [
      {
        body:
          `Declaramos, para os devidos fins de declaração de imposto de renda, ` +
          `que ${org.name}${org.document ? `, inscrita sob o CNPJ/CPF ${org.document},` : ""} ` +
          `recebeu de ${(patient.guardian as { full_name?: string; cpf?: string } | null)?.full_name ?? patient.full_name}${(patient.guardian as { cpf?: string } | null)?.cpf ? ` (CPF ${(patient.guardian as { cpf?: string }).cpf})` : ""} a quantia total de ${formatBRL(total)} ` +
          `referente a serviços de psicologia prestados durante o ano-calendário de ${year}` +
          (psychologist
            ? `, sob responsabilidade profissional de ${psychologist.full_name}${psychologist.crp ? ` (${psychologist.crp})` : ""}`
            : "") +
          ".",
      },
      ...(settings.city
        ? [{ heading: "Local e data", body: `${settings.city}, ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}` }]
        : []),
    ],
    signature: psychologist
      ? {
          name: psychologist.full_name,
          crp: psychologist.crp,
          hashInput: `recibo|${profile.organization_id}|${patientId}|${year}|${total}`,
        }
      : undefined,
    footer: `Recibo emitido por ${org.name} via PSYSTEM. Confira os valores com seus comprovantes de pagamento.`,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${year}.pdf"`,
    },
  });
}
