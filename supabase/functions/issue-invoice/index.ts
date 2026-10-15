// issue-invoice — emissão de NFS-e via provedor externo.
// Fluxo: charge paga → POST provider → NFS-e autorizada →
// PDF/XML em Storage → invoices.status = 'issued' → aviso ao paciente.
//
// NÃO emitir NFS-e própria — municípios têm regras distintas (PRD §7).
// Adapter: eNotas, FocusNFe, NFE.io... Um único provider no MVP.

import { createClient } from "jsr:@supabase/supabase-js@2";

// interface InvoiceProvider {
//   issue(input: {
//     orgDocument: string;   // CNPJ/CPF do prestador
//     patientName: string;
//     patientDocument?: string;
//     serviceDescription: string;
//     amountCents: number;
//   }): Promise<{ providerInvoiceId: string }>;
//   download(invoiceId: string): Promise<{ pdf: Uint8Array; xml: Uint8Array }>;
// }

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { chargeId } = (await req.json()) as { chargeId: string };
  if (!chargeId) {
    return Response.json({ error: "charge_id_required" }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { db: { schema: "psystem" } },
  );

  const { data: charge, error } = await supabase
    .from("charges")
    .select("id, organization_id, status, amount_cents, patient_id")
    .eq("id", chargeId)
    .single();

  if (error || !charge) {
    return Response.json({ error: "charge_not_found" }, { status: 404 });
  }
  if (charge.status !== "paid") {
    return Response.json({ error: "charge_not_paid" }, { status: 409 });
  }

  // Cria solicitação de emissão (idempotente por charge).
  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .upsert(
      {
        organization_id: charge.organization_id,
        charge_id: charge.id,
        provider: Deno.env.get("INVOICE_PROVIDER") ?? "unset",
        status: "requested",
      },
      { onConflict: "charge_id" },
    )
    .select()
    .single();

  if (invError) {
    return Response.json({ error: invError.message }, { status: 500 });
  }

  // TODO: chamar provider, baixar PDF/XML para o bucket 'invoices',
  // atualizar invoices.status='issued', number, pdf_path, xml_path,
  // e enfileirar message 'document_available' para o paciente (ET-015).

  return Response.json({ ok: true, invoiceId: invoice.id, status: "requested" });
});
