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

  const kind = (formData.get("kind") as string) || "consultation";
  const isBlock = kind === "block";
  const patientId = (formData.get("patient_id") as string) || null;
  const psychologistId = formData.get("psychologist_id") as string;
  const roomId = (formData.get("room_id") as string) || null;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMin = Number(formData.get("duration_min") ?? 50);
  const modality = (formData.get("modality") as string) || "in_person";
  const meetingLink = (formData.get("meeting_link") as string)?.trim() || null;
  const adminNotes = (formData.get("admin_notes") as string)?.trim() || null;
  const priceReais = Number(formData.get("price") ?? 0);
  const repeatWeeks = Math.min(
    Math.max(Number(formData.get("repeat_weeks") ?? 1), 1),
    52,
  );

  if (!psychologistId || !date || !time || (!isBlock && !patientId)) {
    redirect("/agenda/novo?error=required");
  }

  const startsAt = new Date(`${date}T${time}:00`);

  const buildRow = (start: Date) => ({
    organization_id: profile.organization_id,
    patient_id: isBlock ? null : patientId,
    psychologist_id: psychologistId,
    room_id: modality === "in_person" ? roomId : null,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + durationMin * 60_000).toISOString(),
    modality,
    status: isBlock ? "blocked" : "awaiting_confirmation",
    price_cents: isBlock ? null : Math.round(priceReais * 100),
    meeting_link: modality === "online" ? meetingLink : null,
    admin_notes: adminNotes,
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

  const { data: patient } = patientId
    ? await supabase
        .from("patients")
        .select("full_name, email")
        .eq("id", patientId)
        .single()
    : { data: null };

  if (patient && patientId) {
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
    .select("patient_id, psychologist_id, starts_at")
    .eq("id", appointmentId)
    .single();
  if (!current) return { error: "Agendamento não encontrado." };

  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);

  // Política de reagendamento do profissional dono da consulta.
  // O próprio psicólogo remarca livremente; recepção/admin seguem a regra.
  if (current.psychologist_id !== profile.id) {
    const { data: member } = await supabase
      .from("organization_members")
      .select(
        "reschedule_enabled, reschedule_min_hours, reschedule_within_availability",
      )
      .eq("organization_id", profile.organization_id)
      .eq("user_id", current.psychologist_id)
      .single();

    if (member && !member.reschedule_enabled) {
      return { error: "Este profissional não permite reagendamento." };
    }

    if (member && member.reschedule_min_hours > 0) {
      const deadline =
        new Date(current.starts_at).getTime() -
        member.reschedule_min_hours * 3_600_000;
      if (Date.now() > deadline) {
        return {
          error: `Reagendamento permitido somente até ${member.reschedule_min_hours}h antes da consulta.`,
        };
      }
    }

    if (member?.reschedule_within_availability) {
      const weekday = startsAt.getDay();
      const startHm = `${time.slice(0, 5)}`;
      const endHm = endsAt.toTimeString().slice(0, 5);
      const { data: slots } = await supabase
        .from("availability")
        .select("start_time, end_time")
        .eq("psychologist_id", current.psychologist_id)
        .eq("weekday", weekday);
      const fits = (slots ?? []).some(
        (s) =>
          s.start_time.slice(0, 5) <= startHm && s.end_time.slice(0, 5) >= endHm,
      );
      if (!fits) {
        return {
          error:
            "Este profissional só permite reagendamento dentro dos horários de atendimento dele.",
        };
      }
    }
  }

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

// Solicitação de horário feita pelo paciente no portal — o staff aprova
// (cria o appointment real; conflito volta como aviso) ou recusa.
export async function approveAppointmentRequest(requestId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("appointment_requests")
    .select("patient_id, psychologist_id, preferred_starts_at, duration_min, status")
    .eq("id", requestId)
    .single();

  if (!req || req.status !== "open") {
    redirect("/agenda?notice=request:invalid");
  }

  const start = new Date(req.preferred_starts_at);
  const { error } = await supabase.from("appointments").insert({
    organization_id: profile.organization_id,
    patient_id: req.patient_id,
    psychologist_id: req.psychologist_id,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + req.duration_min * 60_000).toISOString(),
    modality: "in_person",
    status: "awaiting_confirmation",
    created_by: profile.id,
  });

  if (error) {
    redirect(
      error.code === "23P01"
        ? "/agenda?notice=request:conflict"
        : "/agenda?notice=request:error",
    );
  }

  await supabase
    .from("appointment_requests")
    .update({
      status: "accepted",
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  revalidatePath("/agenda");
  redirect("/agenda?notice=request:accepted");
}

export async function rejectAppointmentRequest(requestId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  await supabase
    .from("appointment_requests")
    .update({
      status: "rejected",
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "open");

  revalidatePath("/agenda");
  redirect("/agenda?notice=request:rejected");
}
