"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyPatientEmail } from "@/lib/messages";

export async function createAppointment(formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const psychologistId = formData.get("psychologist_id") as string;
  const roomId = (formData.get("room_id") as string) || null;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMin = Number(formData.get("duration_min") ?? 50);
  const modality = (formData.get("modality") as string) || "in_person";
  const priceReais = Number(formData.get("price") ?? 0);
  const repeatWeeks = Math.min(
    Math.max(Number(formData.get("repeat_weeks") ?? 1), 1),
    52,
  );

  if (!patientId || !psychologistId || !date || !time) {
    redirect("/agenda/novo?error=required");
  }

  const startsAt = new Date(`${date}T${time}:00`);

  const buildRow = (start: Date) => ({
    organization_id: profile.organization_id,
    patient_id: patientId,
    psychologist_id: psychologistId,
    room_id: modality === "in_person" ? roomId : null,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + durationMin * 60_000).toISOString(),
    modality,
    status: "awaiting_confirmation",
    price_cents: Math.round(priceReais * 100),
    created_by: profile.id,
  });

  // Recorrência semanal: tenta cada ocorrência; conflitos são pulados.
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert(buildRow(startsAt))
    .select("id")
    .single();

  if (error) {
    // 23P01 = exclusion_violation — conflito de horário (psicólogo ou sala).
    const code = error.code === "23P01" ? "conflict" : "save";
    redirect(`/agenda/novo?error=${code}`);
  }

  let created = 1;
  let conflicts = 0;
  for (let i = 1; i < repeatWeeks; i++) {
    const start = new Date(startsAt);
    start.setDate(start.getDate() + i * 7);
    const { error: repError } = await supabase
      .from("appointments")
      .insert(buildRow(start));
    if (repError) {
      if (repError.code === "23P01") conflicts++;
      else console.error("[agenda] repeat:", repError.message);
    } else {
      created++;
    }
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, email")
    .eq("id", patientId)
    .single();

  if (patient) {
    await notifyPatientEmail(supabase, {
      organizationId: profile.organization_id,
      patientId,
      patientEmail: patient.email,
      patientName: patient.full_name,
      templateKey: "appointment_confirmation",
      relatedType: "appointment",
      relatedId: appt.id,
      variables: {
        date: startsAt.toLocaleDateString("pt-BR"),
        time: time.slice(0, 5),
      },
    });
  }

  revalidatePath("/agenda");
  redirect(
    conflicts > 0
      ? `/agenda?notice=recurrence:${created}:${conflicts}`
      : "/agenda",
  );
}

// Remarcação: atualiza início/fim preservando sala/modalidade.
// A constraint do Postgres continua bloqueando conflito (23P01).
export async function rescheduleAppointment(
  appointmentId: string,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMin = Number(formData.get("duration_min") ?? 50);
  if (!date || !time) return { error: "Informe data e horário." };

  const { data: current } = await supabase
    .from("appointments")
    .select("patient_id")
    .eq("id", appointmentId)
    .single();
  if (!current) return { error: "Agendamento não encontrado." };

  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "awaiting_confirmation",
    })
    .eq("id", appointmentId);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Conflito de horário para o psicólogo ou a sala." };
    }
    console.error("[agenda] reschedule:", error.message);
    return { error: "Não foi possível remarcar." };
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "appointment",
    resourceId: appointmentId,
    action: "AGENDAMENTO_REMARCADO",
    patientId: current.patient_id,
    metadata: { starts_at: startsAt.toISOString() },
  });

  revalidatePath("/agenda");
  return null;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const allowed = [
    "scheduled",
    "awaiting_confirmation",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ];
  if (!allowed.includes(status)) return;

  const { data: appt, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .select("patient_id")
    .single();

  if (!error && appt) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "appointment",
      resourceId: appointmentId,
      action: "AGENDAMENTO_ATUALIZADO",
      patientId: appt.patient_id,
      metadata: { status },
    });
  }

  revalidatePath("/agenda");
}
