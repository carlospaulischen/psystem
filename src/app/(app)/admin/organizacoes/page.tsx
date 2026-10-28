import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTenant } from "../actions";

export const metadata = { title: "Organizações" };

// Camada SaaS: somente platform admin cria/gerencia tenants.
export default async function OrganizacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!profile.is_platform_admin) notFound();

  const params = await searchParams;
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, type, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organizações
        </h1>
        <p className="text-sm text-muted-foreground">
          Administração de tenants do produto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova organização</CardTitle>
        </CardHeader>
        <CardContent>
          {params.error && (
            <p className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {params.error}
            </p>
          )}
          <form action={createTenant} className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="org_name">Organização</Label>
              <Input
                id="org_name"
                name="org_name"
                required
                placeholder="Clínica Exemplo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin_name">Nome do admin</Label>
              <Input
                id="admin_name"
                name="admin_name"
                required
                placeholder="Maria Souza"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin_email">E-mail do admin</Label>
              <Input
                id="admin_email"
                name="admin_email"
                type="email"
                required
                placeholder="admin@clinica.com"
              />
            </div>
            <div className="sm:col-span-3">
              <SubmitButton pendingLabel="Criando…">
                Criar organização e convidar admin
              </SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {(orgs ?? []).map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between py-2.5"
              >
                <span>
                  {o.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {o.slug} · {o.type}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
