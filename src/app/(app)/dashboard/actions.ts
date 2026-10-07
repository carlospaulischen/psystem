"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

// Decisão sobre solicitação do paciente — RLS exige psicólogo responsável.
export async function decideAccessRequest(
  requestId: string,
  decision: "fulfilled" | "denied",
) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: req, error } = await supabase
    .from("access_requests")
    .update({
      status: decision,
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .in("status", ["open", "in_analysis"])
    .select("patient_id")
    .single();

  if (!error && req) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "access_request",
      resourceId: requestId,
      action:
        decision === "fulfilled"
          ? "SOLICITACAO_ATENDIDA"
          : "SOLICITACAO_NEGADA",
      patientId: req.patient_id,
    });
  }

  revalidatePath("/dashboard");
}
