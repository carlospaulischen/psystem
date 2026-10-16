import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { InviteForm } from "./invite-form";
import { MemberActions } from "./member-actions";
import { AvailabilityPanel } from "./availability-panel";
import {
  OrganizationForm,
  ProfileForm,
  SchedulingPolicyForm,
} from "./settings-forms";
import { createOwnPractice } from "../org-actions";
import { Button } from "@/components/ui/button";
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
  const isAdmin = profile.is_org_admin === true;

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

  const { data: org } = await supabase
    .from("organizations")
    .select("name, document, settings")
    .eq("id", profile.organization_id)
    .single();

  const { data: members } = await supabase
    .from("organization_members")
    .select(
      "user_id, role, is_admin, status, profile:profiles!user_id(full_name, crp)",
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at")
    .returns<
      {
        user_id: string;
        role: string;
        is_admin: boolean;
        status: string;
        profile: { full_name: string; crp: string | null } | null;
      }[]
    >();

  const { data: myMemberships } = await supabase
    .from("organization_members")
    .select("organization_id, organization:organizations(type)")
    .eq("status", "active")
    .returns<
      { organization_id: string; organization: { type: string } | null }[]
    >();
  const hasOwnPractice = (myMemberships ?? []).some(
    (m) => m.organization?.type === "individual",
  );

  const { data: myPolicy } =
    profile.role === "psychologist"
      ? await supabase
          .from("organization_members")
          .select(
            "reschedule_enabled, reschedule_min_hours, reschedule_within_availability",
          )
          .eq("organization_id", profile.organization_id)
          .eq("user_id", profile.id)
          .single()
      : { data: null };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organização</CardTitle>
            <CardDescription>
              Dados da clínica ou consultório — usados em documentos e NFS-e.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin && org ? (
              <OrganizationForm
                org={{
                  name: org.name,
                  document: org.document,
                  settings:
                    (org.settings as Record<string, string | null>) ?? {},
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-muted-foreground">Nome</dt>
                <dd>{org?.name}</dd>
                <dt className="text-muted-foreground">CNPJ/CPF</dt>
                <dd>{org?.document ?? "—"}</dd>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>
                  {profile.organization?.type === "clinic"
                    ? "Clínica"
                    : "Individual"}
                </dd>
              </dl>
            )}
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
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {m.profile?.full_name}
                      {m.user_id === profile.id && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABEL[m.role] ?? m.role}
                      {m.is_admin && m.role !== "clinic_admin" && " · Admin"}
                      {m.profile?.crp && ` · ${m.profile.crp}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    {isAdmin && m.user_id !== profile.id && (
                      <MemberActions memberId={m.user_id} status={m.status} />
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

        {profile.role === "psychologist" && myPolicy && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reagendamento</CardTitle>
              <CardDescription>
                Quem pode remarcar suas consultas e com quais limites. Você
                sempre pode remarcar a própria agenda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchedulingPolicyForm policy={myPolicy} />
            </CardContent>
          </Card>
        )}

        {profile.role === "psychologist" && !hasOwnPractice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Meu consultório particular
              </CardTitle>
              <CardDescription>
                Atende pacientes particulares fora desta clínica? Crie seu
                consultório — pacientes, agenda e notas fiscais ficam
                separados e você alterna entre os contextos pela barra
                lateral.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createOwnPractice}>
                <Button type="submit" variant="outline">
                  Criar meu consultório
                </Button>
              </form>
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
            <CardDescription>
              {ROLE_LABEL[profile.role] ?? profile.role}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={{
                full_name: profile.full_name,
                crp: profile.crp,
                role: profile.role,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
