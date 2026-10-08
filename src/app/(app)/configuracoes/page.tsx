import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { InviteForm } from "./invite-form";
import { MemberActions } from "./member-actions";
import { AvailabilityPanel } from "./availability-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = {
  clinic_admin: "Administração",
  psychologist: "Psicólogo(a)",
  receptionist: "Recepção",
};

export default async function ConfiguracoesPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const isAdmin = profile.role === "clinic_admin";

  const { data: availability } =
    profile.role === "psychologist"
      ? await supabase
          .from("availability")
          .select("id, weekday, start_time, end_time")
          .eq("psychologist_id", profile.id)
          .order("weekday")
          .order("start_time")
          .returns<
            {
              id: string;
              weekday: number;
              start_time: string;
              end_time: string;
            }[]
          >()
      : { data: null };

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role, status, crp")
    .eq("organization_id", profile.organization_id)
    .order("created_at")
    .returns<
      {
        id: string;
        full_name: string;
        role: string;
        status: string;
        crp: string | null;
      }[]
    >();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organização</CardTitle>
            <CardDescription>Dados da clínica ou consultório.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Nome</dt>
              <dd>{profile.organization?.name}</dd>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>
                {profile.organization?.type === "clinic"
                  ? "Clínica"
                  : "Individual"}
              </dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipe</CardTitle>
            <CardDescription>
              Membros com acesso à plataforma nesta organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {members?.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {m.full_name}
                      {m.id === profile.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[m.role] ?? m.role}
                      {m.crp && ` · ${m.crp}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    {isAdmin && m.id !== profile.id && (
                      <MemberActions memberId={m.id} status={m.status} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {profile.role === "psychologist" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minha disponibilidade</CardTitle>
              <CardDescription>
                Horários semanais em que você atende — usados na agenda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityPanel slots={availability ?? []} />
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Convidar membro</CardTitle>
              <CardDescription>
                A pessoa recebe um e-mail para definir a senha. O acesso fica
                como &quot;Convite enviado&quot; até o primeiro login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Nome</dt>
              <dd>{profile.full_name}</dd>
              <dt className="text-muted-foreground">Função</dt>
              <dd>{ROLE_LABEL[profile.role] ?? profile.role}</dd>
              {profile.crp && (
                <>
                  <dt className="text-muted-foreground">CRP</dt>
                  <dd>{profile.crp}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
