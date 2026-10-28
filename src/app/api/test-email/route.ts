import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// Diagnóstico do Resend — GET /api/test-email?to=voce@exemplo.com
// Restrito a staff logado; retorna o resultado cru da API.
export async function GET(req: NextRequest) {
  try {
    await requireStaff();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json(
      { error: "passe ?to=email@exemplo.com" },
      { status: 400 },
    );
  }

  const result = await sendEmail({
    to,
    subject: "PSYSTEM — teste de envio",
    html: "<p>Teste de configuração do Resend. Se você recebeu isto, o envio está funcionando.</p>",
  });

  return NextResponse.json({
    ...result,
    hasKey: Boolean(process.env.RESEND_API_KEY),
    from: process.env.EMAIL_FROM ?? "(default)",
  });
}
