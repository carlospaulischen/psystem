"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function createPatient(formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) redirect("/pacientes/novo?error=required");

  const psychologistId = (formData.get("psychologist_id") as string) || null;

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      organization_id: profile.organization_id,
      full_name: fullName,
      cpf: (formData.get("cpf") as string) || null,
      birth_date: (formData.get("birth_date") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      admin_notes: (formData.get("admin_notes") as string) || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !patient) {
    redirect("/pacientes/novo?error=save");
  }

  // Vínculo paciente ↔ psicólogo responsável (ABAC — base do acesso clínico).
  if (psychologistId) {
    await supabase.from("patient_links").insert({
      organization_id: profile.organization_id,
      patient_id: patient.id,
      psychologist_id: psychologistId,
    });
    // Prontuário é criado junto ao vínculo.
    await supabase.from("clinical_records").insert({
      organization_id: profile.organization_id,
      patient_id: patient.id,
    });
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient",
    resourceId: patient.id,
    action: "PACIENTE_CRIADO",
    patientId: patient.id,
  });

  redirect(`/pacientes/${patient.id}`);
}

export type ImportResult = {
  imported: number;
  errors: { line: number; name: string; reason: string }[];
};

// Importação em lote via CSV (modelo em /pacientes/importar/modelo).
// Separador ';'. Colunas: nome;email;telefone;cpf;data_nascimento;observacoes.
// Somente 'nome' é obrigatório; linhas inválidas são ignoradas e reportadas.
export async function importPatientsCsv(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const file = formData.get("csv_file") as File | null;
  if (!file || file.size === 0) {
    return { imported: 0, errors: [{ line: 0, name: "-", reason: "Nenhum arquivo enviado." }] };
  }

  const text = (await file.text()).replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const result: ImportResult = { imported: 0, errors: [] };

  // Primeira linha é o cabeçalho do modelo — pula.
  const rows = lines.slice(1);

  for (const [i, raw] of rows.entries()) {
    const lineNo = i + 2; // linha real no arquivo (1 = cabeçalho)
    const cells = raw.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    const [name, email, phone, cpf, birth, notes] = cells;

    if (!name) {
      result.errors.push({ line: lineNo, name: "(vazio)", reason: "Nome é obrigatório." });
      continue;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push({ line: lineNo, name, reason: `E-mail inválido: "${email}".` });
      continue;
    }
    let birthDate: string | null = null;
    if (birth) {
      const m = birth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) birthDate = `${m[3]}-${m[2]}-${m[1]}`;
      else if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) birthDate = birth;
      else {
        result.errors.push({ line: lineNo, name, reason: `Data inválida: "${birth}" (use DD/MM/AAAA).` });
        continue;
      }
    }

    const { error } = await supabase.from("patients").insert({
      organization_id: profile.organization_id,
      full_name: name,
      email: email || null,
      phone: phone || null,
      cpf: cpf || null,
      birth_date: birthDate,
      admin_notes: notes || null,
      created_by: profile.id,
    });

    if (error) {
      result.errors.push({ line: lineNo, name, reason: "Falha ao salvar no banco." });
      continue;
    }
    result.imported += 1;
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient",
    action: "PACIENTES_IMPORTADOS_CSV",
    metadata: { imported: result.imported, errors: result.errors.length },
  });

  revalidatePath("/pacientes");
  return result;
}

// Cria registro de atendimento (versão 1) via função do banco que
// valida vínculo psicólogo-paciente (create_record_entry — ET-004).
export async function addRecordEntry(
  recordId: string,
  patientId: string,
  formData: FormData,
) {
  await requireStaff();
  const supabase = await createClient();

  const content = (formData.get("content") as string)?.trim();
  if (!content) return;

  const { error } = await supabase.rpc("create_record_entry", {
    p_record_id: recordId,
    p_appointment_id: null,
    p_entry_type: "session",
    p_content: content,
    p_procedures: (formData.get("procedures") as string) || null,
  });

  if (error) {
    console.error("[record] create_record_entry:", error.message);
  }

  revalidatePath(`/pacientes/${patientId}`);
}

export type VersionState = { error?: string } | null;

// Nova versão de um registro existente — exige change_reason (ET-004/005).
export async function addRecordVersion(
  entryId: string,
  patientId: string,
  _prev: VersionState,
  formData: FormData,
): Promise<VersionState> {
  await requireStaff();
  const supabase = await createClient();

  const content = (formData.get("content") as string)?.trim();
  const reason = (formData.get("change_reason") as string)?.trim();
  if (!content) return { error: "Escreva o conteúdo da nova versão." };

  const { error } = await supabase.rpc("add_entry_version", {
    p_entry_id: entryId,
    p_content: content,
    p_procedures: (formData.get("procedures") as string) || null,
    p_change_reason: reason || null,
  });

  if (error) {
    if (error.message.includes("change_reason_required")) {
      return { error: "Informe o motivo da alteração." };
    }
    console.error("[record] add_entry_version:", error.message);
    return { error: "Não foi possível salvar a nova versão." };
  }

  revalidatePath(`/pacientes/${patientId}`);
  return null;
}

// Convite de acesso ao portal do paciente: cria o usuário Auth (convite
// por e-mail → ele define a senha) e vincula em patient_accounts.
export async function invitePatientPortal(patientId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("email, full_name")
    .eq("id", patientId)
    .single();
  if (!patient?.email) return;

  const { data: existing } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("patient_id", patientId)
    .maybeSingle();
  if (existing) return;

  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const admin = createAdminClient();

  const { data: invite, error } = await admin.auth.admin.inviteUserByEmail(
    patient.email,
    {
      data: { full_name: patient.full_name, app: "psystem" },
      redirectTo: `${origin}/auth/callback?next=/portal`,
    },
  );

  let userId = invite?.user?.id;
  // Se o e-mail já existe no Auth, vincula o usuário existente.
  if (error?.message?.includes("already been registered")) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email === patient.email)?.id;
  }
  if (!userId) {
    console.error("[portal] invite:", error?.message);
    return;
  }

  await admin.from("patient_accounts").insert({
    patient_id: patientId,
    user_id: userId,
  });

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient",
    resourceId: patientId,
    action: "PACIENTE_PORTAL_CONVIDADO",
    patientId,
  });

  revalidatePath(`/pacientes/${patientId}`);
}

export async function updatePatient(patientId: string, formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const fullName = (formData.get("full_name") as string)?.trim();
  if (!fullName) redirect(`/pacientes/${patientId}/editar?error=required`);

  const guardianName = (formData.get("guardian_name") as string)?.trim();
  const guardian =
    guardianName != null && guardianName !== ""
      ? {
          full_name: guardianName,
          phone: (formData.get("guardian_phone") as string) || null,
          kinship: (formData.get("guardian_kinship") as string) || null,
        }
      : null;

  // Consentimento LGPD: marcado → grava timestamp/versão (preserva a
  // data original se já havia); desmarcado → revoga.
  const consentGiven = formData.get("consent") === "on";
  const { data: current } = await supabase
    .from("patients")
    .select("consent_at")
    .eq("id", patientId)
    .single();

  const { error } = await supabase
    .from("patients")
    .update({
      full_name: fullName,
      cpf: (formData.get("cpf") as string) || null,
      birth_date: (formData.get("birth_date") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      admin_notes: (formData.get("admin_notes") as string) || null,
      guardian,
      consent_at: consentGiven
        ? (current?.consent_at ?? new Date().toISOString())
        : null,
      consent_version: consentGiven
        ? (current?.consent_at ? undefined : "v1")
        : null,
    })
    .eq("id", patientId);

  if (error) {
    redirect(`/pacientes/${patientId}/editar?error=save`);
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient",
    resourceId: patientId,
    action: "PACIENTE_ATUALIZADO",
    patientId,
  });

  revalidatePath(`/pacientes/${patientId}`);
  redirect(`/pacientes/${patientId}`);
}

// Anexos administrativos — bucket privado 'patient-files', pasta por org.
export async function uploadAttachment(patientId: string, formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const path = `${profile.organization_id}/${patientId}/${crypto.randomUUID()}-${file.name}`;

  const { error: upError } = await supabase.storage
    .from("patient-files")
    .upload(path, file, { contentType: file.type });

  if (upError) {
    console.error("[attachments] upload:", upError.message);
    return;
  }

  await supabase.from("patient_attachments").insert({
    organization_id: profile.organization_id,
    patient_id: patientId,
    file_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    uploaded_by: profile.id,
  });

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient_attachment",
    resourceId: patientId,
    action: "ANEXO_ENVIADO",
    patientId,
    metadata: { file_name: file.name },
  });

  revalidatePath(`/pacientes/${patientId}`);
}

export async function deleteAttachment(attachmentId: string, patientId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("patient_attachments")
    .select("file_path, file_name")
    .eq("id", attachmentId)
    .single();
  if (!att) return;

  await supabase.storage.from("patient-files").remove([att.file_path]);
  await supabase.from("patient_attachments").delete().eq("id", attachmentId);

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "patient_attachment",
    resourceId: attachmentId,
    action: "ANEXO_REMOVIDO",
    patientId,
    metadata: { file_name: att.file_name },
  });

  revalidatePath(`/pacientes/${patientId}`);
}

export async function updatePatientStatus(patientId: string, status: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("patients")
    .update({ status })
    .eq("id", patientId);

  if (!error) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "patient",
      resourceId: patientId,
      action: status === "archived" ? "PACIENTE_ARQUIVADO" : "PACIENTE_ATUALIZADO",
      patientId,
      metadata: { status },
    });
  }

  revalidatePath(`/pacientes/${patientId}`);
}

// Anamnese: envia o modelo do psicólogo (ou o padrão do sistema) como
// snapshot — edições futuras do modelo não alteram o que já foi enviado.
// Só o psicólogo responsável pode enviar (RLS valida de novo).
export async function sendAnamnesis(patientId: string) {
  const { profile } = await requireStaff();
  if (profile.role !== "psychologist") return;

  const supabase = await createClient();
  const { DEFAULT_ANAMNESIS } = await import("@/lib/anamnese");

  const { data: tpl } = await supabase
    .from("anamnesis_templates")
    .select("questions")
    .eq("organization_id", profile.organization_id)
    .eq("psychologist_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();

  const tplQuestions = tpl?.questions as unknown[] | null;
  const questions =
    tplQuestions && tplQuestions.length ? tplQuestions : DEFAULT_ANAMNESIS;

  const { data: response, error } = await supabase
    .from("anamnesis_responses")
    .insert({
      organization_id: profile.organization_id,
      patient_id: patientId,
      psychologist_id: profile.id,
      questions,
      sent_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !response) {
    console.error("[anamnese] send:", error?.message);
    redirect(`/pacientes/${patientId}?error=anamnese`);
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "anamnesis_response",
    resourceId: response.id,
    action: "ANAMNESE_ENVIADA",
    patientId,
  });

  revalidatePath(`/pacientes/${patientId}`);
}
