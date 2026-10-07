import { createClient } from "@/lib/supabase/server";
import { addRecordEntry } from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Entry {
  id: string;
  entry_type: string;
  latest_version: number;
  created_at: string;
  versions: { content: string; procedures: string | null; created_at: string }[];
}

const ENTRY_TYPE_LABEL: Record<string, string> = {
  demand: "Demanda",
  objectives: "Objetivos",
  session: "Atendimento",
  procedure: "Procedimento",
  closing: "Encerramento",
  note: "Anotação",
};

// Painel do prontuário — só renderiza para o psicólogo responsável
// (a query retorna vazio para qualquer outro perfil, via RLS).
export async function ClinicalRecordPanel({
  recordId,
  patientId,
}: {
  recordId: string;
  patientId: string;
}) {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("record_entries")
    .select(
      "id, entry_type, latest_version, created_at, versions:record_entry_versions(content, procedures, created_at)",
    )
    .eq("record_id", recordId)
    .order("created_at", { ascending: false })
    .returns<Entry[]>();

  const addAction = addRecordEntry.bind(null, recordId, patientId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo registro</CardTitle>
          <CardDescription>
            Registros são versionados — edições criam novas versões e preservam
            o histórico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="content">Evolução / registro do atendimento</Label>
              <Textarea id="content" name="content" rows={5} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="procedures">Procedimentos / condutas</Label>
              <Textarea id="procedures" name="procedures" rows={2} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar registro</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <ul className="space-y-4">
              {entries.map((e) => {
                const latest = e.versions.reduce((a, b) =>
                  a.created_at > b.created_at ? a : b,
                );
                return (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {ENTRY_TYPE_LABEL[e.entry_type] ?? e.entry_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                        {e.latest_version > 1 && ` · v${e.latest_version}`}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {latest?.content}
                    </p>
                    {latest?.procedures && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Procedimentos:</span>{" "}
                        {latest.procedures}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum registro ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
