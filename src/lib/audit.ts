import { createClient } from "@/lib/supabase/server";

// Trilha de auditoria (ET-017). Registra ações sensíveis executadas pelo
// usuário autenticado. Tabela append-only — ninguém edita/apaga via app.
export async function logAudit(input: {
  organizationId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  patientId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_audit", {
    p_organization_id: input.organizationId,
    p_resource_type: input.resourceType,
    p_resource_id: input.resourceId ?? null,
    p_action: input.action,
    p_patient_id: input.patientId ?? null,
    p_metadata: input.metadata ?? {},
  });
  if (error) {
    // Auditoria não deve derrubar a operação, mas precisa ser visível.
    console.error("[audit] falha ao registrar:", error.message);
  }
}
