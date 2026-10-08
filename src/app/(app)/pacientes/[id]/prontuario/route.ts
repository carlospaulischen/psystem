import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderBrandedPdf } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";

const ENTRY_TYPE_LABEL: Record<string, string> = {
  demand: "Demanda",
  objectives: "Objetivos",
  session: "Atendimento",
  procedure: "Procedimento",
  closing: "Encerramento",
  note: "Anotação",
};

// Exportação do prontuário (ET-010): exige motivo e fica auditada.
// RLS garante que somente o psicólogo responsável chega até aqui.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const motivo = request.nextUrl.searchParams.get("motivo")?.trim();
  if (!motivo) {
    return new Response("Informe o motivo da exportação.", { status: 400 });
  }

  const { profile } = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("clinical_records")
    .select(
      "id, status, created_at, patient:patients(full_name, birth_date)",
    )
    .eq("patient_id", id)
    .single();
  if (!record) notFound();

  const { data: entries } = await supabase
    .from("record_entries")
    .select(
      "entry_type, created_at, versions:record_entry_versions(version, content, procedures)",
    )
    .eq("record_id", record.id)
    .order("created_at");

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "clinical_record",
    resourceId: record.id,
    action: "PRONTUARIO_EXPORTADO",
    patientId: id,
    metadata: { motivo },
  });

  const sections =
    entries?.map((e) => {
      const versions = (e.versions as { version: number; content: string; procedures: string | null }[])
        .sort((a, b) => b.version - a.version);
      const latest = versions[0];
      return {
        heading: `${ENTRY_TYPE_LABEL[e.entry_type] ?? e.entry_type} — ${new Date(e.created_at).toLocaleString("pt-BR")}`,
        body: `${latest?.content ?? ""}${latest?.procedures ? `\n\nProcedimentos: ${latest.procedures}` : ""}`,
      };
    }) ?? [];

  const pdf = await renderBrandedPdf({
    title: "Prontuário — registro de atendimentos",
    subtitle: `Paciente: ${(Array.isArray(record.patient) ? record.patient[0] : record.patient)?.full_name ?? ""} · Emitido por ${profile.full_name} · ${new Date().toLocaleString("pt-BR")}`,
    sections,
    footer:
      "Documento confidencial — conteúdo protegido por sigilo profissional (Res. CFP 06/2019 e LGPD). Compartilhe apenas com a finalidade declarada.",
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prontuario-${id.slice(0, 8)}.pdf"`,
    },
  });
}
