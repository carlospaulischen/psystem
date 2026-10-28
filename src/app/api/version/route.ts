import { NextResponse } from "next/server";

// Versão do deploy — o client compara periodicamente e sugere reload
// quando muda. VERCEL_GIT_COMMIT_SHA vem do ambiente da Vercel.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
