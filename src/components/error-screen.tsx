import Image from "next/image";

// Tela de erro compartilhada (404, erro de runtime, erro global).
// `children` = ações (links/botões) específicas de cada contexto.
export function ErrorScreen({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 text-center text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-[420px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 -bottom-28 size-[420px] rounded-full bg-[#14b8a6]/15 blur-3xl"
      />

      <Image
        src="/brand/psystem/symbol-1024.png"
        alt=""
        width={1024}
        height={1024}
        className="size-16"
        priority
      />

      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-primary">
        {code}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        {description}
      </p>

      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </main>
  );
}
