"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";

type Factor = { id: string; status: string };

// Ativação de TOTP: gera o QR/segredo, confirma com um código válido,
// e a partir daí o login exige o segundo fator (enforced em requireStaff).
export function MfaPanel() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{
    id: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const supabase = createClient();

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  useEffect(() => {
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => setFactors(data?.totp ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = (factors ?? []).filter((f) => f.status === "verified");

  async function startEnroll() {
    setPending(true);
    setError(null);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "PSYSTEM",
    });
    setPending(false);
    if (enrollError || !data) {
      setError("Não foi possível iniciar a ativação.");
      return;
    }
    setEnrolling({
      id: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setPending(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code: code.trim(),
    });
    setPending(false);
    if (verifyError) {
      setError("Código inválido. Confira o app e tente de novo.");
      return;
    }
    setEnrolling(null);
    setCode("");
    await refresh();
  }

  async function disable(factorId: string) {
    setPending(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId,
    });
    setPending(false);
    if (unenrollError) {
      setError("Não foi possível desativar.");
      return;
    }
    await refresh();
  }

  if (factors === null) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  if (enrolling) {
    return (
      <form onSubmit={confirmEnroll} className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Escaneie o QR code com seu app autenticador (Google Authenticator,
          1Password, Authy…) ou copie a chave abaixo.
        </p>
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(enrolling.qr)}`}
            alt="QR code TOTP"
            className="size-36 rounded-lg border"
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Chave manual:</p>
            <code className="break-all text-xs">{enrolling.secret}</code>
          </div>
        </div>
        <div className="grid gap-2 sm:max-w-48">
          <Label htmlFor="mfa_code">Código de 6 dígitos</Label>
          <Input
            id="mfa_code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center tracking-[0.3em]"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setEnrolling(null)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || code.length !== 6}>
            {pending ? "Verificando…" : "Ativar"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Autenticação em duas etapas</p>
        <p className="text-xs text-muted-foreground">
          {verified.length > 0
            ? "Login exige senha + código do app autenticador."
            : "Proteja a conta com um código do app autenticador além da senha."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {verified.length > 0 ? (
          <>
            <StatusBadge status="active" />
            {verified.map((f) => (
              <Button
                key={f.id}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => disable(f.id)}
              >
                Desativar
              </Button>
            ))}
          </>
        ) : (
          <Button onClick={startEnroll} disabled={pending} size="sm">
            {pending ? "Gerando…" : "Ativar MFA"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
