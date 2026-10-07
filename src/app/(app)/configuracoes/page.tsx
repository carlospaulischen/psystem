import { requireStaff } from "@/lib/auth";
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
