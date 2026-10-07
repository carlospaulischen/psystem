"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/app/(auth)/login/actions";

const NAV = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const ROLE_LABEL: Record<string, string> = {
  clinic_admin: "Administração",
  psychologist: "Psicólogo(a)",
  receptionist: "Recepção",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar({
  profile,
}: {
  profile: {
    full_name: string;
    role: string;
    organization?: { name: string } | null;
  };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5">
        <Image
          src="/brand/psystem/logo-horizontal-dark.png"
          alt="PSYSTEM"
          width={510}
          height={255}
          className="h-9 w-auto"
          priority
        />
        <p className="mt-2 truncate text-xs text-sidebar-foreground/60">
          {profile.organization?.name}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Separator className="mb-3 bg-sidebar-border" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent/60">
            <Avatar className="size-8">
              <AvatarFallback className="bg-sidebar-primary/20 text-xs text-sidebar-primary-foreground">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {profile.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {ROLE_LABEL[profile.role] ?? profile.role}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem onSelect={() => logout()}>
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
