"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { notifyPatientEmail } from "@/lib/messages";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function patientContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string,
) {
  const { data } = await supabase
    .from("patients")
    .select("full_name, email")
    .eq("id", patientId)
    .single();
  return data;
}

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

  const patient = await patientContact(supabase, patientId);
  if (patient) {
    await notifyPatientEmail(supabase, {
      organizationId: profile.organization_id,
      patientId,
      patientEmail: patient.email,
      patientName: patient.full_name,
      templateKey: "charge_pending",
      relatedType: "charge",
      relatedId: charge.id,
      variables: { amount: brl(Math.round(amountReais * 100)) },
    });
  }

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

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert({
      organization_id: profile.organization_id,
      charge_id: chargeId,
      gateway: "manual",
      amount_cents: charge.amount_cents,
      method: "manual",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (payError || !payment) return;

  await supabase
    .from("charges")
    .update({ status: "paid" })
    .eq("id", chargeId);

  // Pagamento gera a NFS-e em pré-emissão: 'awaiting_review' com prazo de
  // 5 dias para o profissional validar — nunca sai sem confirmação humana.
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("charge_id", chargeId)
    .maybeSingle();
  if (!existingInvoice) {
    await supabase.from("invoices").insert({
      organization_id: profile.organization_id,
      charge_id: chargeId,
      payment_id: payment.id,
      provider: "internal",
      status: "awaiting_review",
      review_deadline: new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "charge",
    resourceId: chargeId,
    action: "COBRANCA_PAGA_MANUAL",
    patientId: charge.patient_id,
  });

  const patient = await patientContact(supabase, charge.patient_id);
  if (patient) {
    await notifyPatientEmail(supabase, {
      organizationId: profile.organization_id,
      patientId: charge.patient_id,
      patientEmail: patient.email,
      patientName: patient.full_name,
      templateKey: "payment_received",
      relatedType: "charge",
      relatedId: chargeId,
    });
  }

  revalidatePath("/financeiro");
}

// Aprovação da NFS-e pelo profissional/admin — exige confirmação explícita
// ("revisei e autorizo"). Recepcionista não aprova documento fiscal.
export async function approveInvoice(invoiceId: string, formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  if (profile.role === "receptionist") return;
  if (formData.get("confirmed") !== "on") {
    redirect("/financeiro/notas?error=confirm");
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .update({
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("status", "awaiting_review")
    .select("charge_id")
    .single();

  if (!error && invoice) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "invoice",
      resourceId: invoiceId,
      action: "NFSE_APROVADA",
      metadata: { charge_id: invoice.charge_id },
    });
  }

  revalidatePath("/financeiro/notas");
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
