"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  DOC_TYPES,
  DOC_TEMPLATE_VERSION,
  docTemplate,
  type DocType,
} from "@/lib/doc-templates";

// Cria documento em rascunho com a versão 1 do conteúdo.
// Se o conteúdo vier vazio, gera o modelo do tipo escolhido — declarações
// vinculadas a um atendimento já saem com data/hora reais da agenda.
// RLS garante: somente o psicólogo responsável pelo paciente.
export async function createDocument(formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const type = formData.get("type") as string;
  const purpose = (formData.get("purpose") as string)?.trim();
  const appointmentId = (formData.get("appointment_id") as string) || null;
  let content = (formData.get("content") as string)?.trim();

  if (!patientId || !DOC_TYPES.includes(type as DocType) || !purpose) {
    redirect("/documentos/novo?error=required");
  }

  // Vínculo com atendimento: valida que a consulta é do paciente e do
  // psicólogo logado — RLS já barra acesso indevido, mas o vínculo precisa
  // ser consistente (declaração só refere atendimento real do paciente).
  let appointmentLabel: string | null = null;
  if (appointmentId) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("patient_id, starts_at, modality")
      .eq("id", appointmentId)
      .single();
    if (!appt || appt.patient_id !== patientId) {
      redirect("/documentos/novo?error=save");
    }
    const start = new Date(appt.starts_at);
    appointmentLabel =
      start.toLocaleDateString("pt-BR") +
      " às " +
      start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) +
      (appt.modality === "online" ? " (online)" : " (presencial)");
  }

  if (!content) {
    const { data: patient } = await supabase
      .from("patients")
      .select("full_name")
      .eq("id", patientId)
      .single();
    content = docTemplate(type, {
      patientName: patient?.full_name ?? "[paciente]",
      psychologistName: profile.full_name,
      crp: profile.crp,
      appointmentLabel,
    });
  }
  if (!content) redirect("/documentos/novo?error=required");

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      organization_id: profile.organization_id,
      patient_id: patientId,
      author_id: profile.id,
      type,
      purpose,
      appointment_id: appointmentId,
      template_version: DOC_TEMPLATE_VERSION,
      recipient_name: (formData.get("recipient_name") as string) || null,
      recipient_service:
        (formData.get("recipient_service") as string) || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !doc) {
    console.error("[docs] insert:", error?.message);
    redirect("/documentos/novo?error=save");
  }

  await supabase.from("document_versions").insert({
    document_id: doc.id,
    version: 1,
    content,
    created_by: profile.id,
  });

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "document",
    resourceId: doc.id,
    action: "DOCUMENTO_CRIADO",
    patientId,
    metadata: { type, purpose },
  });

  redirect(`/documentos/${doc.id}`);
}

// Nova versão do conteúdo — apenas enquanto rascunho/em revisão.
export async function addDocumentVersion(
  docId: string,
  currentVersion: number,
  formData: FormData,
) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const content = (formData.get("content") as string)?.trim();
  if (!content) return;

  const { error } = await supabase.from("document_versions").insert({
    document_id: docId,
    version: currentVersion + 1,
    content,
    created_by: profile.id,
  });

  if (!error) {
    await supabase
      .from("documents")
      .update({ current_version: currentVersion + 1 })
      .eq("id", docId);

    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "document",
      resourceId: docId,
      action: "DOCUMENTO_NOVA_VERSAO",
      metadata: { version: currentVersion + 1 },
    });
  }

  revalidatePath(`/documentos/${docId}`);
}

// Emitir: congela o conteúdo numa versão final com issued_at e
// muda o status — a partir daí o documento não volta a rascunho.
export async function issueDocument(docId: string, latestContent: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("current_version, patient_id, status")
    .eq("id", docId)
    .single();
  if (!doc || (doc.status !== "draft" && doc.status !== "in_review")) return;

  const { error: vError } = await supabase
    .from("document_versions")
    .insert({
      document_id: docId,
      version: doc.current_version + 1,
      content: latestContent,
      created_by: profile.id,
      issued_at: new Date().toISOString(),
    });
  if (vError) return;

  await supabase
    .from("documents")
    .update({
      status: "issued",
      current_version: doc.current_version + 1,
    })
    .eq("id", docId);

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "document",
    resourceId: docId,
    action: "DOCUMENTO_EMITIDO",
    patientId: doc.patient_id,
    metadata: { version: doc.current_version + 1 },
  });

  revalidatePath(`/documentos/${docId}`);
}

// Entrega: registra destinatário/canal e marca como entregue.
export async function deliverDocument(docId: string, formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const deliveredTo = (formData.get("delivered_to") as string)?.trim();
  const channel = (formData.get("channel") as string)?.trim();
  if (!deliveredTo || !channel) return;

  const { data: doc } = await supabase
    .from("documents")
    .select("current_version, patient_id, status")
    .eq("id", docId)
    .single();
  if (!doc || doc.status !== "issued") return;

  const { error } = await supabase.from("document_deliveries").insert({
    document_id: docId,
    version: doc.current_version,
    delivered_to: deliveredTo,
    channel,
    delivered_by: profile.id,
  });
  if (error) return;

  await supabase
    .from("documents")
    .update({ status: "delivered" })
    .eq("id", docId);

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "document",
    resourceId: docId,
    action: "DOCUMENTO_ENTREGUE",
    patientId: doc.patient_id,
    metadata: { delivered_to: deliveredTo, channel },
  });

  revalidatePath(`/documentos/${docId}`);
}

export async function invalidateDocument(docId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("patient_id, status")
    .eq("id", docId)
    .single();
  if (!doc || doc.status !== "issued") return;

  await supabase
    .from("documents")
    .update({ status: "invalidated" })
    .eq("id", docId);

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "document",
    resourceId: docId,
    action: "DOCUMENTO_INVALIDADO",
    patientId: doc.patient_id,
  });

  revalidatePath(`/documentos/${docId}`);
}

export async function setDocumentReview(docId: string, review: boolean) {
  await requireStaff();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("status")
    .eq("id", docId)
    .single();
  if (!doc) return;

  const next = review ? "in_review" : "draft";
  if (doc.status === next) return;

  await supabase.from("documents").update({ status: next }).eq("id", docId);
  revalidatePath(`/documentos/${docId}`);
}
