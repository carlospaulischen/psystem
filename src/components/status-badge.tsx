import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mapa central de status → rótulo pt-BR + cor.
// Reunido aqui para agenda, financeiro, pacientes e documentos usarem
// a mesma linguagem visual.

const STYLES: Record<string, { label: string; className: string }> = {
  // appointments
  scheduled: { label: "Agendada", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  awaiting_confirmation: { label: "Aguardando", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  confirmed: { label: "Confirmada", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  completed: { label: "Realizada", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  cancelled: { label: "Cancelada", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  no_show: { label: "Faltou", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  blocked: { label: "Bloqueado", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  // portal
  portal_active: { label: "Portal vinculado", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  // access requests
  open: { label: "Aberta", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  in_analysis: { label: "Em análise", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  fulfilled: { label: "Atendida", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  denied: { label: "Negada", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  // appointment requests
  accepted: { label: "Aprovada", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  rejected: { label: "Recusada", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  // members
  invited: { label: "Convite enviado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  inactive: { label: "Inativo", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  // patients
  active: { label: "Ativo", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  paused: { label: "Pausado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  closed: { label: "Encerrado", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  archived: { label: "Arquivado", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  // charges
  pending: { label: "Pendente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  paid: { label: "Pago", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  overdue: { label: "Vencido", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  // documents
  draft: { label: "Rascunho", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
  in_review: { label: "Em revisão", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  issued: { label: "Emitido", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  delivered: { label: "Entregue", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  invalidated: { label: "Invalidado", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? {
    label: status,
    className: "bg-zinc-500/15 text-zinc-600",
  };
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", style.className)}>
      {style.label}
    </Badge>
  );
}
