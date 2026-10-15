"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorScreen } from "@/components/error-screen";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      code="Erro inesperado"
      title="Algo não saiu como esperado"
      description="Ocorreu um erro ao carregar esta página. Tente novamente — se o problema persistir, fale com o suporte."
    >
      <Button size="lg" onClick={() => retry()}>
        Tentar novamente
      </Button>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        Ir para o painel
      </Link>
    </ErrorScreen>
  );
}
