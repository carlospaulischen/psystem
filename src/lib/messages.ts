// Templates NEUTROS de notificação ao paciente (ET-015):
// nunca mencionar "psicólogo", "consulta terapêutica", diagnóstico ou
// qualquer conteúdo clínico. Ver docs/compliance-matrix.md §8.

import { sendEmail, type SendEmailResult } from "@/lib/email";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ---------------------------------------------------------------------------
// E-mails de autenticação (convites e recuperação) — enviados pelo Resend
// porque o SMTP do Supabase Auth é do projeto inteiro (compartilhado com
// outro app). Links gerados via admin.generateLink.
// ---------------------------------------------------------------------------

const authEmailShell = (title: string, body: string, cta: string, url: string) => `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:18px;font-weight:600">${title}</h2>
  <p style="font-size:14px;line-height:1.6">${body}</p>
  <p style="margin:24px 0">
    <a href="${url}" style="background:#0f766e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">${cta}</a>
  </p>
  <p style="font-size:12px;color:#666">Se o botão não funcionar, copie e cole este link no navegador:<br>${url}</p>
  <p style="font-size:12px;color:#999;margin-top:24px">PSYSTEM — Gestão para psicólogos e clínicas</p>
</div>`;

export async function sendAuthEmail(
  kind: "staff_invite" | "patient_invite" | "password_reset",
  params: { to: string; name?: string; orgName?: string; actionLink: string },
): Promise<SendEmailResult> {
  const { to, name, orgName, actionLink } = params;
  const first = name?.split(" ")[0];

  const { subject, html } = (() => {
    switch (kind) {
      case "staff_invite":
        return {
          subject: "Você foi convidado para o PSYSTEM",
          html: authEmailShell(
            `Olá${first ? `, ${first}` : ""}`,
            `Você foi convidado para a equipe de <strong>${orgName ?? "uma organização"}</strong> no PSYSTEM. Crie sua senha para começar.`,
            "Criar minha senha",
            actionLink,
          ),
        };
      case "patient_invite":
        return {
          subject: "Acesse seu portal",
          html: authEmailShell(
            `Olá${first ? `, ${first}` : ""}`,
            `${orgName ?? "Seu consultório"} disponibilizou um portal para você acompanhar seus agendamentos e comunicações. Crie sua senha para acessar.`,
            "Acessar o portal",
            actionLink,
          ),
        };
      case "password_reset":
        return {
          subject: "Redefinição de senha — PSYSTEM",
          html: authEmailShell(
            `Olá${first ? `, ${first}` : ""}`,
            `Recebemos uma solicitação para redefinir sua senha. Se não foi você, ignore este e-mail — sua senha permanece a mesma.`,
            "Redefinir senha",
            actionLink,
          ),
        };
    }
  })();

  const result = await sendEmail({ to, subject, html });
  // Sem RESEND_API_KEY (dev), o link precisa estar acessível no console
  // para o fluxo de convite/recuperação continuar testável localmente.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:dev] ${kind} link: ${actionLink}`);
  }
  if (!result.ok) {
    console.error(`[auth-email] ${kind} falhou: ${result.error}`);
  }
  return result;
}
