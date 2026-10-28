import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { acceptContract } from "../../actions";

export const metadata = { title: "Contrato" };

// Leitura do contrato emitido + botão de aceite (prova LGPD/jurídica).
// RLS: o paciente só lê documents 'delivered' dele mesmo.
export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, content, status, issued_at, type")
    .eq("id", id)
    .single();
  if (!doc || doc.type !== "contract") redirect("/portal");

  const { data: acceptance } = await supabase
    .from("document_acceptances")
    .select("accepted_at")
    .eq("document_id", id)
    .maybeSingle();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/portal" className="hover:text-foreground">
          Meu portal
        </Link>{" "}
        / Contrato
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{doc.title}</CardTitle>
          {doc.issued_at && (
            <p className="text-xs text-muted-foreground">
              Emitido em{" "}
              {new Date(doc.issued_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
            {doc.content}
          </div>

          {acceptance ? (
            <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              Você aceitou este contrato em{" "}
              {new Date(acceptance.accepted_at).toLocaleString("pt-BR")}.
            </p>
          ) : (
            <form action={acceptContract.bind(null, doc.id)} className="mt-4">
              <SubmitButton className="w-full" pendingLabel="Registrando…">
                Li e aceito os termos do contrato
              </SubmitButton>
              <p className="mt-2 text-xs text-muted-foreground">
                Ao clicar, registramos seu aceite com data, hora e
                identificação da sessão.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
