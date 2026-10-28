// Envio de e-mail transacional via Resend (API REST — sem SDK).
// Sem RESEND_API_KEY roda em modo dev: retorna sucesso e loga no console,
// assim o fluxo local não quebra e os envios ficam registrados em message_logs.

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "PSYSTEM <notificacoes@psystem.app.br>";

  if (!apiKey) {
    console.log(`[email:dev] para=${params.to} assunto="${params.subject}"`);
    return { ok: true };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!res.ok) {
      return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, providerId: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network" };
  }
}
