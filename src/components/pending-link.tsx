"use client";

import Link, { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

// Link que mostra spinner enquanto a navegação está pendente —
// mudanças só de searchParams não disparam o loading.tsx.
export function PendingLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
      <Spinner />
    </Link>
  );
}

function Spinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className="size-3.5 animate-spin" />;
}
