// send-message — dispatcher de WhatsApp/e-mail.
// Chamado por pg_cron (lembretes/cobranças) e pela app (envios manuais).
//
// ET-015: NUNCA incluir conteúdo clínico. Templates devem ser neutros —
// ver docs/compliance-matrix.md §8.
//
// Adapter: implementar o provider escolhido em ./providers/ (360dialog,
// Twilio, Z-API, Resend, SES...). A interface abaixo é o contrato estável.

import { createClient } from "jsr:@supabase/supabase-js@2";

interface MessageRequest {
  channel: "whatsapp" | "email";
  templateKey: string;
  recipient: string;
  patientId?: string;
  organizationId: string;
  relatedType?: "appointment" | "charge" | "document";
  relatedId?: string;
  variables?: Record<string, string>;
}

// Templates NEUTROS — sem diagnóstico, motivo de consulta ou dados clínicos.
const TEMPLATES: Record<string, (v: Record<string, string>) => string> = {
  appointment_confirmation: (v) =>
    `Olá, ${v.patientName}. Você possui uma consulta agendada para ${v.date} às ${v.time}. Acesse o portal para confirmar.`,
  appointment_reminder: (v) =>
    `Olá, ${v.patientName}. Lembrete: você possui um compromisso amanhã às ${v.time}.`,
  charge_pending: (v) =>
    `Olá, ${v.patientName}. Há uma cobrança pendente em seu nome. Acesse: ${v.paymentLink}`,
  payment_received: (v) =>
    `Olá, ${v.patientName}. Confirmamos o recebimento do seu pagamento. Obrigado.`,
  document_available: (v) =>
    `Olá, ${v.patientName}. Você possui uma nova comunicação da sua clínica. Acesse o portal para visualizá-la.`,
};

// TODO: implementar provider real. Exemplo de contrato:
// interface MessageProvider {
//   send(channel: string, to: string, body: string): Promise<{ providerId: string }>;
// }
// const provider = getProvider(Deno.env.get("MESSAGE_PROVIDER") ?? "log");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const payload = (await req.json()) as MessageRequest;
  const render = TEMPLATES[payload.templateKey];
  if (!render) {
    return Response.json({ error: "unknown_template" }, { status: 400 });
  }

  const body = render(payload.variables ?? {});

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // MVP: registra o envio na fila (message_logs). Substituir o bloco abaixo
  // pela chamada ao provider quando o adapter estiver implementado.
  const { error } = await supabase.from("message_logs").insert({
    organization_id: payload.organizationId,
    patient_id: payload.patientId ?? null,
    channel: payload.channel,
    template_key: payload.templateKey,
    recipient: payload.recipient,
    status: "queued",
    related_type: payload.relatedType ?? null,
    related_id: payload.relatedId ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, status: "queued", preview: body });
});
