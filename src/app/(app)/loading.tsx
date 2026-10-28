import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Exibido durante o carregamento de qualquer tela da área interna —
// o Next suspende a navegação até o server component resolver.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando…
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 bg-muted-foreground/15" />
        <Skeleton className="h-9 w-32 bg-muted-foreground/15" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-muted-foreground/15" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl bg-muted-foreground/15" />
    </div>
  );
}
