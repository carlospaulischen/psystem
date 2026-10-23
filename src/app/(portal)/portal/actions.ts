"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const REQUEST_TYPES = ["declaration", "certificate", "report", "document"];

// Solicitação do paciente (ET-016): o portal registra o pedido; quem decide
// é o psicólogo responsável — o paciente nunca acessa conteúdo direto.
export async function createAccessRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user.id)
    .single();
  if (!account) return;

  const { data: patient } = await supabase
    .from("patients")
    .select("organization_id")
    .eq("id", account.patient_id)
    .single();
  if (!patient) return;

  const requestType = formData.get("request_type") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  if (!REQUEST_TYPES.includes(requestType)) return;

  await supabase.from("access_requests").insert({
    organization_id: patient.organization_id,
    patient_id: account.patient_id,
    requested_by: user.id,
    request_type: requestType,
    period: (formData.get("period") as string) || null,
    note,
  });

  revalidatePath("/portal");
}

// Pedido de horário: o paciente sugere data/hora e o staff decide na agenda.
// O vínculo ativo define o psicólogo — o paciente não escolhe nem inventa
// horários que "travem" a agenda (a constraint de conflito não se aplica).
export async function requestAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  if (!date || !time) return;

  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime()) || startsAt < new Date()) return;

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user.id)
    .single();
  if (!account) return;

  const { data: patient } = await supabase
    .from("patients")
    .select("organization_id")
    .eq("id", account.patient_id)
    .single();
  if (!patient) return;

  const { data: link } = await supabase
    .from("patient_links")
    .select("psychologist_id")
    .eq("patient_id", account.patient_id)
    .eq("status", "active")
    .single();
  if (!link) return;

  await supabase.from("appointment_requests").insert({
    organization_id: patient.organization_id,
    patient_id: account.patient_id,
    psychologist_id: link.psychologist_id,
    preferred_starts_at: startsAt.toISOString(),
    note,
    requested_by: user.id,
  });

  revalidatePath("/portal");
}

// Confirmação de presença pelo portal — via RPC que garante: só a própria
// consulta, e apenas de scheduled/awaiting_confirmation → confirmed.
export async function confirmAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { error } = await supabase.rpc("confirm_own_appointment", {
    p_appointment_id: appointmentId,
  });

  if (error) {
    console.error("[portal] confirm:", error.message);
  }

  revalidatePath("/portal");
}

// Cancelamento pelo paciente — a RPC valida a janela configurada pelo
// psicólogo (cancel_min_hours). Fora da janela, o paciente fala com a clínica.
export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { error } = await supabase.rpc("cancel_own_appointment", {
    p_appointment_id: appointmentId,
  });

  if (error) {
    redirect(
      `/portal?notice=${
        error.message.includes("cancel_window_expired")
          ? "cancel_window"
          : "cancel_denied"
      }`,
    );
  }

  revalidatePath("/portal");
}

// Resposta da anamnese pelo paciente — RLS garante: só a própria resposta,
// só enquanto 'sent', e o status só pode ir para 'answered'.
export async function submitAnamnesis(responseId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: response } = await supabase
    .from("anamnesis_responses")
    .select("questions")
    .eq("id", responseId)
    .single();
  if (!response) return;

  const questions = (response.questions ?? []) as { q: string }[];
  const answers = questions.map((q, i) => ({
    q: q.q,
    a: ((formData.get(`a_${i}`) as string) ?? "").trim(),
  }));

  const { error } = await supabase
    .from("anamnesis_responses")
    .update({
      answers,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", responseId);

  if (error) {
    console.error("[portal] anamnesis:", error.message);
  }

  revalidatePath("/portal");
}
