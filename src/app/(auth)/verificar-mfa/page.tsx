import Image from "next/image";
import { MfaForm } from "./mfa-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default async function VerificarMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/psystem/logo.png"
            alt="PSYSTEM — Tecnologia para saúde mental"
            width={200}
            height={160}
            className="mx-auto mb-1 h-auto w-44"
            priority
          />
          <CardDescription>Verificação em duas etapas</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Abra seu app autenticador e informe o código de 6 dígitos.
          </p>
          <MfaForm next={next ?? "/dashboard"} />
        </CardContent>
      </Card>
    </main>
  );
}
