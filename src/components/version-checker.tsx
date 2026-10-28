"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Banner "nova versão disponível": faz polling em /api/version e
// quando o deploy muda oferece reload. Evita sessão presa em build velho.
export function VersionChecker() {
  const [outdated, setOutdated] = useState(false);
  const current = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version } = (await res.json()) as { version: string };
        if (!alive) return;
        if (current.current === null) current.current = version;
        else if (version !== current.current) setOutdated(true);
      } catch {
        // falha de rede não deve quebrar a checagem
      }
    };
    check();
    const t = setInterval(check, 90_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!outdated) return null;

  return (
    <button
      onClick={() => window.location.reload()}
      className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
    >
      <RefreshCw className="size-4" />
      Nova versão disponível — clique para atualizar
    </button>
  );
}
