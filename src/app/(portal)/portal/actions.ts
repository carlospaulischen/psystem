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
