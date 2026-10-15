import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { ErrorScreen } from "@/components/error-screen";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <ErrorScreen
      code="Erro 404"
      title="Página não encontrada"
      description="O endereço que você tentou acessar não existe ou foi movido."
    >
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Voltar ao início
      </Link>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ir para o painel
      </Link>
    </ErrorScreen>
  );
}
