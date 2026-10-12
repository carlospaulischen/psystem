// daily-jobs — rotina diária disparada pelo pg_cron.
// 1. Marca cobranças vencidas (pending + due_date < hoje → overdue).
// 2. Envia lembrete neutro (ET-015) para consultas das próximas ~12–36h
//    por e-mail via Resend; sem RESEND_API_KEY fica só em message_logs.
// 3. Dedup: não reenvia lembrete do mesmo agendamento nas últimas 20h.
//
// Chamada interna (kong/pg_cron). Se CRON_SECRET estiver definido,
// exige header x-cron-secret correspondente.

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "PSYSTEM <notificacoes@psystem.com.br>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: true, providerId: undefined };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  return res.ok
    ? { ok: true, providerId: data.id }
    : { ok: false, error: data.message ?? `HTTP ${res.status}` };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  // 1. Cobranças vencidas
  const { data: overdueRows } = await supabase
    .from("charges")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today)
    .select("id");

  // 2. Lembretes — consultas entre +12h e +36h (aprox. "amanhã" em qualquer fuso)
  const from = new Date(Date.now() + 12 * 3600_000).toISOString();
  const to = new Date(Date.now() + 36 * 3600_000).toISOString();

  const { data: appts } = await supabase
    .from("appointments")
    .select(
      "id, organization_id, starts_at, patient:patients(id, full_name, email)",
    )
    .gte("starts_at", from)
    .lt("starts_at", to)
    .in("status", ["scheduled", "awaiting_confirmation", "confirmed"]);

  let sent = 0;
  let skipped = 0;
  const cutoff = new Date(Date.now() - 20 * 3600_000).toISOString();

  for (const appt of appts ?? []) {
    const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
    if (!patient?.email) {
      skipped++;
      continue;
    }

    const { count } = await supabase
      .from("message_logs")
      .select("id", { count: "exact", head: true })
      .eq("related_id", appt.id)
      .eq("template_key", "appointment_reminder")
      .gte("created_at", cutoff);
    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }

    const startsAt = new Date(appt.starts_at);
    const time = startsAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const firstName = String(patient.full_name).split(" ")[0];

    const result = await sendEmail(
      patient.email,
      "Lembrete de compromisso",
      `<p>Olá, ${firstName}.</p><p>Lembrete: você possui um compromisso amanhã às <strong>${time}</strong>.</p>`,
    );

    await supabase.from("message_logs").insert({
      organization_id: appt.organization_id,
      patient_id: patient.id,
      channel: "email",
      template_key: "appointment_reminder",
      recipient: patient.email,
      status: result.ok ? "sent" : "failed",
      provider: "resend",
      provider_id: result.providerId ?? null,
      related_type: "appointment",
      related_id: appt.id,
      sent_at: new Date().toISOString(),
    });

    if (result.ok) sent++;
    else skipped++;
  }

  return Response.json({
    ok: true,
    overdue_marked: overdueRows?.length ?? 0,
    reminders_sent: sent,
    reminders_skipped: skipped,
  });
});
