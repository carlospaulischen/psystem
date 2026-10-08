import Image from "next/image";
import { setNewPassword } from "../login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/psystem/logo.png"
            alt="PSYSTEM"
            width={140}
            height={140}
            className="mb-1 h-auto w-28"
            priority
          />
          <CardDescription>Defina sua nova senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={setNewPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de 8 caracteres.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
              />
            </div>

            {params.error && (
              <p className="text-sm text-destructive">
                {params.error === "invalid"
                  ? "As senhas não conferem ou são muito curtas."
                  : "Não foi possível salvar. Refaça o processo pelo link do e-mail."}
              </p>
            )}

            <Button type="submit" className="w-full">
              Salvar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
