import Link from "next/link";
import { List, Plus, CalendarRange } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentStatusMenu } from "./status-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

type Row = Appointment & { psychologist: { full_name: string } | null };

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_DOT: Record<string, string> = {
  scheduled: "border-l-emerald-500",
  awaiting_confirmation: "border-l-amber-500",
  confirmed: "border-l-blue-500",
  completed: "border-l-emerald-600",
  no_show: "border-l-red-500",
  cancelled: "border-l-muted-foreground opacity-60",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; notice?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "list";
  const supabase = await createClient();

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, modality, patient:patients(full_name), psychologist:profiles!psychologist_id(full_name)",
    )
    .gte("starts_at", rangeStart.toISOString())
    .lt("starts_at", rangeEnd.toISOString())
    .order("starts_at")
    .returns<Row[]>();

  // Agrupa por dia para a visão de agenda.
  const byDay = new Map<string, Row[]>();
  for (const a of appointments ?? []) {
    const key = new Date(a.starts_at).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  // Aviso de recorrência: "recurrence:criadas:conflitos".
  let recurrenceNotice: string | null = null;
  if (sp.notice?.startsWith("recurrence:")) {
    const [, created, conflicts] = sp.notice.split(":");
    recurrenceNotice = `${created} consulta(s) criada(s); ${conflicts} semana(s) pulada(s) por conflito de agenda.`;
  }

  // Grade semanal: sempre os próximos 7 dias a partir de hoje.
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Próximos 7 dias</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <Link
              href="/agenda"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-3.5" />
              Lista
            </Link>
            <Link
              href="/agenda?view=week"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "week"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarRange className="size-3.5" />
              Semana
            </Link>
          </div>
          <Link href="/agenda/novo" className={buttonVariants()}>
            <Plus className="size-4" />
            Novo agendamento
          </Link>
        </div>
      </header>

      {recurrenceNotice && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {recurrenceNotice}
        </p>
      )}

      {view === "week" ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => {
            const items = byDay.get(d.toDateString()) ?? [];
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <section
                key={d.toDateString()}
                className={cn(
                  "min-h-32 rounded-xl border bg-card p-2.5",
                  isToday && "border-primary/50 ring-1 ring-primary/20",
                )}
              >
                <h2
                  className={cn(
                    "mb-2 text-xs font-semibold capitalize",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {dayLabel(d.toISOString())}
                </h2>
                <ul className="space-y-1.5">
                  {items.map((a) => (
                    <li
                      key={a.id}
                      className={cn(
                        "rounded-md border border-l-4 bg-background px-2 py-1.5",
                        STATUS_DOT[a.status] ?? "border-l-border",
                      )}
                    >
                      <p className="text-xs font-medium tabular-nums">
                        {timeLabel(a.starts_at)}
                      </p>
                      <p className="truncate text-xs">
                        {a.patient?.full_name ?? "Bloqueio"}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {a.psychologist?.full_name?.split(" ")[0]}
                        {a.modality === "online" ? " · Online" : ""}
                      </p>
                    </li>
                  ))}
                  {items.length === 0 && (
                    <li className="pt-3 text-center text-[11px] text-muted-foreground/60">
                      —
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {byDay.size === 0 && (
            <div className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum agendamento nos próximos 7 dias.
            </div>
          )}
          {[...byDay.entries()].map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-medium capitalize text-muted-foreground">
                {dayLabel(items[0].starts_at)}
              </h2>
              <ul className="divide-y divide-border rounded-xl border bg-card">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 font-medium tabular-nums">
                        {timeLabel(a.starts_at)}
                      </span>
                      <div>
                        <p className="font-medium">
                          {a.patient?.full_name ?? "Bloqueio"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.psychologist?.full_name} ·{" "}
                          {a.modality === "online" ? "Online" : "Presencial"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={a.status} />
                      {a.status !== "cancelled" && a.status !== "completed" && (
                        <AppointmentStatusMenu
                          appointmentId={a.id}
                          startsAt={a.starts_at}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
