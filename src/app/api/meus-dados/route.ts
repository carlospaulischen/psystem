import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Direito do titular (LGPD art. 18): exportação dos dados cadastrais
// do próprio paciente. Dados clínicos ficam fora — seguem fluxo CFP.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("patient_accounts")
    .select("patient_id")
    .eq("user_id", user.id)
    .single();
  if (!account) {
    return NextResponse.json({ error: "not a patient" }, { status: 403 });
  }

  const pid = account.patient_id;
  const [patient, appointments, charges, requests] = await Promise.all([
    supabase
      .from("patients")
      .select("full_name, cpf, birth_date, phone, email, admin_notes, created_at")
      .eq("id", pid)
      .single(),
    supabase
      .from("appointments")
      .select("starts_at, modality, status, created_at")
      .eq("patient_id", pid),
    supabase
      .from("charges")
      .select("amount_cents, status, due_date, created_at")
      .eq("patient_id", pid),
    supabase
      .from("access_requests")
      .select("request_type, status, created_at")
      .eq("patient_id", pid),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    titular: patient.data,
    agendamentos: appointments.data ?? [],
    cobrancas: charges.data ?? [],
    solicitacoes: requests.data ?? [],
    nota: "Dados clínicos (prontuário, anamnese) não são exportados por este canal — solicite ao seu psicólogo.",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados.json"`,
    },
  });
}
