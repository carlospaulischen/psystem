// Templates NEUTROS de notificação ao paciente (ET-015):
// nunca mencionar "psicólogo", "consulta terapêutica", diagnóstico ou
// qualquer conteúdo clínico. Ver docs/compliance-matrix.md §8.

import { sendEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

type TemplateVars = Record<string, string>;

const TEMPLATES: Record<
  string,
  (v: TemplateVars) => { subject: string; html: string }
> = {
  appointment_confirmation: (v) => ({
    subject: "Confirmação de agendamento",
    html: `<p>Olá, ${v.patientName}.</p><p>Você possui um agendamento para <strong>${v.date} às ${v.time}</strong>. Acesse o portal para confirmar.</p>`,
  }),
  appointment_reminder: (v) => ({
    subject: "Lembrete de compromisso",
    html: `<p>Olá, ${v.patientName}.</p><p>Lembrete: você possui um compromisso amanhã às <strong>${v.time}</strong>.</p>`,
  }),
  charge_pending: (v) => ({
    subject: "Cobrança disponível",
    html: `<p>Olá, ${v.patientName}.</p><p>Há uma cobrança pendente em seu nome no valor de <strong>${v.amount}</strong>. Acesse o portal para visualizar.</p>`,
  }),
  payment_received: (v) => ({
    subject: "Pagamento confirmado",
    html: `<p>Olá, ${v.patientName}.</p><p>Confirmamos o recebimento do seu pagamento. Obrigado.</p>`,
  }),
  document_available: (v) => ({
    subject: "Nova comunicação disponível",
    html: `<p>Olá, ${v.patientName}.</p><p>Você possui uma nova comunicação. Acesse o portal para visualizar.</p>`,
  }),
};

// Envia e-mail ao paciente e registra em message_logs (status sent|failed).
// Falha de envio não quebra o fluxo principal — fica registrada no log.
export async function notifyPatientEmail(
  supabase: SupabaseClient<any, any, any>,
  params: {
    organizationId: string;
    patientId: string;
    patientEmail: string | null;
    patientName: string;
    templateKey: keyof typeof TEMPLATES;
    relatedType?: "appointment" | "charge" | "document";
    relatedId?: string;
    variables?: TemplateVars;
  },
): Promise<void> {
  if (!params.patientEmail) return;

  const render = TEMPLATES[params.templateKey];
  const { subject, html } = render({
    patientName: params.patientName.split(" ")[0],
    ...params.variables,
  });

  const result = await sendEmail({ to: params.patientEmail, subject, html });

  await supabase.from("message_logs").insert({
    organization_id: params.organizationId,
    patient_id: params.patientId,
    channel: "email",
    template_key: params.templateKey,
    recipient: params.patientEmail,
    status: result.ok ? "sent" : "failed",
    provider: "resend",
    provider_id: result.providerId ?? null,
    related_type: params.relatedType ?? null,
    related_id: params.relatedId ?? null,
    sent_at: new Date().toISOString(),
  });

  if (!result.ok) {
    console.error(`[messages] ${params.templateKey} falhou: ${result.error}`);
  }
}
