"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importPatientsCsv, type ImportResult } from "../actions";

export function ImportForm() {
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(
    importPatientsCsv,
    null,
  );

  return (
    <section className="mt-6 rounded-2xl border bg-card p-6">
      <h2 className="font-semibold">2. Envie o arquivo preenchido</h2>

      <form action={action} className="mt-4 space-y-4">
        <input
          type="file"
          name="csv_file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        <Button type="submit" disabled={pending}>
          <Upload className="size-4" />
          {pending ? "Importando…" : "Importar pacientes"}
        </Button>
      </form>

      {result && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium">
            {result.imported > 0
              ? `${result.imported} paciente(s) importado(s) com sucesso.`
              : "Nenhum paciente importado."}
          </p>
          {result.errors.length > 0 && (
            <ul className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              {result.errors.map((e) => (
                <li key={e.line} className="text-destructive">
                  Linha {e.line} — {e.name}: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
