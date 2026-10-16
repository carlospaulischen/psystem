import { redirect } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACTION_LABEL: Record<string, string> = {
  PACIENTE_CRIADO: "Paciente criado",
  PACIENTE_ATUALIZADO: "Paciente atualizado",
  PACIENTE_ARQUIVADO: "Paciente arquivado",
  AGENDAMENTO_CRIADO: "Consulta agendada",
  AGENDAMENTO_ATUALIZADO: "Consulta atualizada",
  AGENDAMENTO_REMARCADO: "Consulta remarcada",
  REGISTRO_CRIADO: "Registro clínico criado",
  REGISTRO_EDITADO: "Registro clínico editado",
  DOCUMENTO_CRIADO: "Documento criado",
  DOCUMENTO_NOVA_VERSAO: "Documento versionado",
  DOCUMENTO_EMITIDO: "Documento emitido",
  DOCUMENTO_ENTREGUE: "Documento entregue",
  DOCUMENTO_INVALIDADO: "Documento invalidado",
  EQUIPE_CONVIDADO: "Membro convidado",
  EQUIPE_STATUS: "Status de membro alterado",
};

interface AuditRow {
  id: number;
  action: string;
  resource_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
  user: { full_name: string } | null;
  patient: { full_name: string } | null;
}

// Trilha de auditoria (ET-017): somente admin vê o log completo da clínica.
export default async function AuditoriaPage() {
  const { profile } = await requireStaff();
  if (!profile.is_org_admin) redirect("/dashboard");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select(
      "id, action, resource_type, created_at, metadata, user:profiles!user_id(full_name), patient:patients(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<AuditRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trilha imutável das ações sensíveis — últimos 100 eventos.
          </p>
        </div>
        <Link
          href="/auditoria/export"
          className={buttonVariants({ variant: "outline" })}
        >
          <Download className="size-4" />
          Exportar CSV
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Eventos</CardTitle>
          <CardDescription>
            Registros são append-only: não podem ser editados nem apagados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs && logs.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {ACTION_LABEL[l.action] ?? l.action}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {l.user?.full_name ?? "sistema"}
                      {l.patient?.full_name && ` · ${l.patient.full_name}`}
                      {` · ${l.resource_type}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
