import Link from "next/link";
import { Download } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importar pacientes" };

export default async function ImportarPacientesPage() {
  await requireStaff();

  return (
    <div className="max-w-2xl">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/pacientes" className="hover:text-foreground">
            Pacientes
          </Link>{" "}
          / Importar
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Importar pacientes via planilha
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suba um CSV com os cadastros em vez de registrar um a um.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">1. Baixe o modelo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha no Excel ou Google Sheets. Somente a coluna{" "}
          <strong>nome</strong> é obrigatória — as demais podem ficar vazias.
          Datas no formato <code>DD/MM/AAAA</code>. Na coluna{" "}
          <strong>psicologo</strong>, escreva o nome do profissional como está
          cadastrado — o paciente já entra vinculado a ele. Linhas com e-mail
          ou CPF já existentes são ignoradas.
        </p>
        <a
          href="/pacientes/importar/modelo"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
          download
        >
          <Download className="size-4" />
          Baixar modelo CSV
        </a>
      </section>

      <ImportForm />
    </div>
  );
}
