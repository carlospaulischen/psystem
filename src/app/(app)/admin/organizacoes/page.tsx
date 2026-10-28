import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createTenant, startSupportAccess } from "../actions";

export const metadata = { title: "Organizações" };

// Camada SaaS: somente platform admin cria/gerencia tenants.
// Listagem via service role — RLS esconderia orgs de outros tenants.
export default async function OrganizacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireStaff();
  if (!profile.is_platform_admin) notFound();

  const params = await searchParams;
  const admin = createAdminClient();

  const [{ data: orgs }, { data: members }] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, type, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("organization_members")
      .select("organization_id, user_id, role, status, profile:profiles(full_name)")
      .eq("status", "active")
      .limit(500),
  ]);

  const membersByOrg = new Map<
    string,
    { user_id: string; role: string; name: string }[]
  >();
  for (const m of members ?? []) {
    const name =
      (m.profile as { full_name?: string } | null)?.full_name ??
      m.user_id.slice(0, 8);
    const list = membersByOrg.get(m.organization_id) ?? [];
    list.push({ user_id: m.user_id, role: m.role, name });
    membersByOrg.set(m.organization_id, list);
  }

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
            {(orgs ?? []).map((o) => {
              const staff = membersByOrg.get(o.id) ?? [];
              return (
                <li key={o.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span>
                      {o.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {o.slug} · {o.type}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {staff.length > 0 && (
                    <form
                      action={startSupportAccess}
                      className="mt-2 flex items-center gap-2"
                    >
                      <input type="hidden" name="org_id" value={o.id} />
                      <select
                        name="user_id"
                        required
                        defaultValue=""
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                      >
                        <option value="" disabled>
                          Acessar como…
                        </option>
                        {staff.map((s) => (
                          <option key={s.user_id} value={s.user_id}>
                            {s.name} ({s.role})
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        size="sm"
                        variant="outline"
                        pendingLabel="Gerando…"
                      >
                        Suporte (2h)
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
