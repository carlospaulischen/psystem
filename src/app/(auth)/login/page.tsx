import Image from "next/image";
import Link from "next/link";
import { login } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; sent?: string }>;
}) {
  const params = await searchParams;

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
          <CardDescription>
            Gestão para psicólogos e clínicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <input
              type="hidden"
              name="next"
              value={params.next ?? "/dashboard"}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@clinica.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/recuperar"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {params.sent && (
              <p className="text-sm text-emerald-600">
                Se o e-mail existir na base, você receberá o link de
                redefinição.
              </p>
            )}
            {params.error && (
              <p className="text-sm text-destructive">
                Não foi possível autenticar. Verifique suas credenciais.
              </p>
            )}

            <SubmitButton className="mt-1 w-full">
              Entrar
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
