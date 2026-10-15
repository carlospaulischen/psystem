"use client";

import { useEffect } from "react";

// Erro no root layout — substitui o documento inteiro, por isso
// traz o próprio <html>/<body> e estilos inline (CSS global pode
// não ter carregado quando este boundary dispara).
export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          backgroundColor: "#f8f9fc",
          color: "#0c1e3c",
          textAlign: "center",
          padding: "24px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/psystem/symbol-128.png"
          alt=""
          width={64}
          height={64}
        />
        <p
          style={{
            marginTop: 32,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#7c5cf0",
          }}
        >
          Erro inesperado
        </p>
        <h1 style={{ marginTop: 12, fontSize: 28, fontWeight: 700 }}>
          Algo não saiu como esperado
        </h1>
        <p style={{ marginTop: 16, maxWidth: 400, color: "#5b6b84", lineHeight: 1.6 }}>
          Ocorreu um erro ao carregar esta página. Tente novamente — se o
          problema persistir, fale com o suporte.
        </p>
        <button
          onClick={() => retry()}
          style={{
            marginTop: 32,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#7c5cf0",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
