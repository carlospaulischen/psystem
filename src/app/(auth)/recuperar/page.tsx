import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "../login/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export default function RecuperarPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/psystem/logo.png"
            alt="PSYSTEM"
            width={140}
            height={140}
            className="mx-auto mb-1 h-auto w-28"
            priority
          />
          <CardDescription>
            Informe seu e-mail para receber o link de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestPasswordReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <SubmitButton className="w-full">
              Enviar link
            </SubmitButton>
            <Link
              href="/login"
              className="text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar para o login
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
