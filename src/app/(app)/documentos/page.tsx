import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const DOC_TYPE_LABEL: Record<string, string> = {
  declaration: "Declaração",
  certificate: "Atestado",
  report: "Relatório",
  multiprofessional_report: "Relatório multiprofissional",
  psychological_evaluation: "Avaliação psicológica",
  referral: "Encaminhamento",
  other: "Outro",
};

export default async function DocumentosPage() {
  const { profile } = await requireStaff();
  const isPsychologist = profile.role === "psychologist";
  const supabase = await createClient();

  const { data: documents } = isPsychologist
    ? await supabase
        .from("documents")
        .select(
          "id, type, status, purpose, created_at, patient:patients(full_name)",
        )
        .order("created_at", { ascending: false })
        .returns<
          {
            id: string;
            type: string;
            status: string;
            purpose: string;
            created_at: string;
            patient: { full_name: string } | null;
          }[]
        >()
    : { data: null };

  return (
    <div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Declarações, atestados, relatórios e encaminhamentos.
          </p>
        </div>
        {isPsychologist && (
          <Link href="/documentos/novo" className={buttonVariants()}>
            <Plus className="size-4" />
            Novo documento
          </Link>
        )}
      </header>

      {!isPsychologist ? (
        <Card className="mt-6">
          <CardHeader className="items-center pt-10 text-center">
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Acesso restrito</CardTitle>
            <CardDescription className="max-w-md">
              Documentos psicológicos são acessíveis apenas ao profissional
              responsável pelo paciente.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10" />
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-0">
            {documents && documents.length > 0 ? (
              <ul className="divide-y divide-border text-sm">
                {documents.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/documentos/${d.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {DOC_TYPE_LABEL[d.type] ?? d.type}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {d.patient?.full_name}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {d.purpose} · emitido em{" "}
                          {new Date(d.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Nenhum documento ainda.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
