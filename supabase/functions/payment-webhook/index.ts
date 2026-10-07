// payment-webhook — recebe confirmação do gateway de pagamento.
// Fluxo: gateway → webhook → valida assinatura → registra payment →
// atualiza charge → (opcional) dispara emissão de NFS-e.
//
// Adapter: cada gateway tem formato/assinatura próprios. Manter o parsing
// no provider e o efeito no banco genérico (ver ./providers/).

import { createClient } from "jsr:@supabase/supabase-js@2";

// interface GatewayAdapter {
//   verifySignature(req: Request, raw: string): boolean;
//   parseEvent(raw: unknown): {
//     gatewayChargeId: string;
//     status: "paid" | "failed" | "refunded";
//     amountCents: number;
//     method: string;
//     paidAt: string;
//   };
// }

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();

  // TODO: selecionar adapter pelo gateway (header, rota ou config da org)
  // e validar a assinatura ANTES de qualquer escrita:
  //   const adapter = getAdapter(gateway);
  //   if (!adapter.verifySignature(req, raw)) {
  //     return new Response("invalid signature", { status: 401 });
  //   }
  //   const event = adapter.parseEvent(JSON.parse(raw));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Esqueleto do efeito (descomentar com o adapter implementado):
  //
  // const { data: charge } = await supabase
  //   .from("charges")
  //   .select("id, organization_id, patient_id")
  //   .eq("gateway_id", event.gatewayChargeId)
  //   .single();
  //
  // if (event.status === "paid" && charge) {
  //   await supabase.from("payments").insert({
  //     organization_id: charge.organization_id,
  //     charge_id: charge.id,
  //     gateway,
  //     gateway_payment_id: event.gatewayChargeId,
  //     amount_cents: event.amountCents,
  //     method: event.method,
  //     paid_at: event.paidAt,
  //     raw: JSON.parse(raw),
  //   });
  //   await supabase.from("charges")
  //     .update({ status: "paid" })
  //     .eq("id", charge.id);
  //   // Momento mágico do produto: pagar → emitir NFS-e automaticamente.
  //   // await supabase.functions.invoke("issue-invoice", {
  //   //   body: { chargeId: charge.id },
  //   // });
  // }

  return Response.json({ ok: true, received: true, bytes: raw.length });
});
