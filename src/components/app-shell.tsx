"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { VersionChecker } from "./version-checker";
import { cn } from "@/lib/utils";

// Shell da área interna: sidebar fixa em desktop, drawer off-canvas
// no mobile (hamburger no topbar + backdrop). Fecha ao navegar.
export function AppShell({
  profile,
  orgs,
  children,
}: {
  profile: Parameters<typeof AppSidebar>[0]["profile"];
  orgs?: { id: string; name: string; type: string }[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-1">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:self-start lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <AppSidebar profile={profile} orgs={orgs} />
      </div>

      <main className="min-w-0 flex-1 bg-muted/40">
        <VersionChecker />
        <AppTopbar onMenu={() => setOpen(true)} />
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
