import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderBrandedPdf } from "@/lib/pdf";
import { logAudit } from "@/lib/audit";
import { DOC_TYPE_LABEL } from "../../page";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Download em PDF da versão emitida/atual do documento.
// RLS garante: somente o psicólogo responsável (ou paciente com doc entregue).
export async function GET(_request: Request, { params }: RouteParams) {
  const { profile } = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "*, patient:patients(full_name), author:profiles!author_id(full_name, crp), versions:document_versions(version, content, issued_at)",
    )
    .eq("id", id)
    .single();
  if (!doc) notFound();

  const sorted = (
    doc.versions as {
      version: number;
      content: string;
      issued_at: string | null;
    }[]
  ).sort((a, b) => b.version - a.version);
  const issued = sorted.find((v) => v.issued_at) ?? sorted[0];
  if (!issued) notFound();

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "document",
    resourceId: doc.id,
    action: "DOCUMENTO_BAIXADO",
    patientId: doc.patient_id,
    metadata: { version: issued.version },
  });

  const patient = Array.isArray(doc.patient)
    ? doc.patient[0]
    : doc.patient;
  const author = Array.isArray(doc.author) ? doc.author[0] : doc.author;

  const pdf = await renderBrandedPdf({
    title:
      DOC_TYPE_LABEL[doc.type as keyof typeof DOC_TYPE_LABEL] ?? "Documento",
    subtitle: `Paciente: ${patient?.full_name ?? ""} · ${doc.purpose}`,
    sections: [{ body: issued.content }],
    signature: author
      ? {
          name: author.full_name,
          crp: author.crp,
          hashInput: `${doc.id}|v${issued.version}|${issued.issued_at ?? ""}|${issued.content}`,
        }
      : undefined,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="documento-${doc.id.slice(0, 8)}.pdf"`,
    },
  });
}
