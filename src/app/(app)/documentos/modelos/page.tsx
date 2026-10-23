import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveContractTemplate } from "../actions";
import {
  CONTRACT_PLACEHOLDERS,
  DEFAULT_CONTRACT,
} from "@/lib/doc-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ModelosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { profile } = await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();
  const isAdmin = profile.is_org_admin === true;

  const { data: tpl } = await supabase
    .from("document_templates")
    .select("name, body, updated_at")
    .eq("organization_id", profile.organization_id)
    .eq("type", "contract")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="max-w-3xl">
      <Link
        href="/documentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Documentos
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Modelo de contrato
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Texto-base do contrato de prestação de serviços desta organização. Os
        campos <code>{"{{campo}}"}</code> são preenchidos automaticamente na
        geração de cada contrato.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Campos dinâmicos</CardTitle>
          <CardDescription>
            {tpl
              ? `Usando o modelo próprio desta organização (atualizado em ${new Date(tpl.updated_at).toLocaleDateString("pt-BR")}).`
              : "Nenhum modelo próprio ainda — a geração usa o modelo padrão do sistema até você salvar o seu."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {CONTRACT_PLACEHOLDERS.map(([field, desc]) => (
              <div key={field} className="flex gap-2">
                <dt>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {field}
                  </code>
                </dt>
                <dd className="text-muted-foreground">{desc}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Texto do contrato</CardTitle>
          {!isAdmin && (
            <CardDescription>
              Somente administradores editam o modelo — você pode visualizar.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <form action={saveContractTemplate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do modelo</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={tpl?.name ?? "Contrato padrão"}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Texto</Label>
                <Textarea
                  id="body"
                  name="body"
                  rows={26}
                  required
                  defaultValue={tpl?.body ?? DEFAULT_CONTRACT}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
              {params.error === "admin" && (
                <p className="text-sm text-destructive">
                  Somente administradores podem editar o modelo.
                </p>
              )}
              {params.saved === "1" && (
                <p className="text-sm text-emerald-600">Modelo salvo.</p>
              )}
              <div className="flex justify-end">
                <Button type="submit">Salvar modelo</Button>
              </div>
            </form>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
              {tpl?.body ?? DEFAULT_CONTRACT}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
