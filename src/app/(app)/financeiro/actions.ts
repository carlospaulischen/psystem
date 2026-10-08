"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createCharge(formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const patientId = formData.get("patient_id") as string;
  const amountReais = Number(formData.get("amount") ?? 0);
  const dueDate = (formData.get("due_date") as string) || null;

  if (!patientId || !(amountReais > 0)) {
    redirect("/financeiro/nova?error=required");
  }

  const { data: charge, error } = await supabase
    .from("charges")
    .insert({
      organization_id: profile.organization_id,
      patient_id: patientId,
      amount_cents: Math.round(amountReais * 100),
      due_date: dueDate,
      status: "pending",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !charge) {
    console.error("[fin] createCharge:", error?.message);
    redirect("/financeiro/nova?error=save");
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "charge",
    resourceId: charge.id,
    action: "COBRANCA_CRIADA",
    patientId,
    metadata: { amount_cents: Math.round(amountReais * 100) },
  });

  redirect("/financeiro");
}

// Baixa manual de pagamento — recebido por fora (dinheiro, PIX direto).
// Quando o gateway real entrar, o webhook continuará atualizando por ele.
export async function markChargePaid(chargeId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: charge } = await supabase
    .from("charges")
    .select("patient_id, amount_cents, status")
    .eq("id", chargeId)
    .single();
  if (!charge || charge.status === "paid" || charge.status === "cancelled") {
    return;
  }

  const { error: payError } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    charge_id: chargeId,
    gateway: "manual",
    amount_cents: charge.amount_cents,
    method: "manual",
    paid_at: new Date().toISOString(),
  });
  if (payError) return;

  await supabase
    .from("charges")
    .update({ status: "paid" })
    .eq("id", chargeId);

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "charge",
    resourceId: chargeId,
    action: "COBRANCA_PAGA_MANUAL",
    patientId: charge.patient_id,
  });

  revalidatePath("/financeiro");
}

export async function cancelCharge(chargeId: string) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const { data: charge, error } = await supabase
    .from("charges")
    .update({ status: "cancelled" })
    .eq("id", chargeId)
    .in("status", ["pending", "overdue"])
    .select("patient_id")
    .single();

  if (!error && charge) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "charge",
      resourceId: chargeId,
      action: "COBRANCA_CANCELADA",
      patientId: charge.patient_id,
    });
  }

  revalidatePath("/financeiro");
}
