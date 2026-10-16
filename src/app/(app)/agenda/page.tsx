import Link from "next/link";
import { List, Plus, CalendarRange, CalendarDays, Check, X, Video } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentStatusMenu } from "./status-menu";
import { approveAppointmentRequest, rejectAppointmentRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

type Row = Appointment & {
  psychologist: { full_name: string } | null;
  meeting_link: string | null;
};

type RequestRow = {
  id: string;
  preferred_starts_at: string;
  duration_min: number;
  note: string | null;
  patient: { full_name: string } | null;
  psychologist: { full_name: string } | null;
};

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
  blocked: "border-l-slate-400 opacity-70",
};

const WEEKDAY_HEADER = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const NOTICES: Record<string, { text: string; tone: "ok" | "warn" }> = {
  "request:accepted": { text: "Horário aprovado — consulta criada na agenda.", tone: "ok" },
  "request:rejected": { text: "Solicitação recusada.", tone: "warn" },
  "request:conflict": { text: "Conflito de agenda: já existe compromisso nesse horário.", tone: "warn" },
  "request:invalid": { text: "Essa solicitação já foi decidida.", tone: "warn" },
  "request:error": { text: "Não foi possível aprovar a solicitação.", tone: "warn" },
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; notice?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : sp.view === "month" ? "month" : "list";
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mês alvo para a visão mensal (?month=YYYY-MM)
  const [mYear, mMonth] = (sp.month ?? "").split("-").map(Number);
  const monthDate =
    mYear > 2000 && mMonth >= 1 && mMonth <= 12
      ? new Date(mYear, mMonth - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
  const monthParam = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const monthLink = (d: Date) =>
    `/agenda?view=month&month=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const rangeStart = new Date(today);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const queryStart = view === "month" ? monthDate : rangeStart;
  const queryEnd =
    view === "month"
      ? new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
      : rangeEnd;

  const [{ data: appointments }, { data: requests }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, modality, meeting_link, admin_notes, patient:patients(full_name), psychologist:profiles!psychologist_id(full_name)",
      )
      .gte("starts_at", queryStart.toISOString())
      .lt("starts_at", queryEnd.toISOString())
      .order("starts_at")
      .returns<Row[]>(),
    supabase
      .from("appointment_requests")
      .select(
        "id, preferred_starts_at, duration_min, note, patient:patients(full_name), psychologist:profiles!psychologist_id(full_name)",
      )
      .eq("status", "open")
      .order("preferred_starts_at")
      .returns<RequestRow[]>(),
  ]);

  const byDay = new Map<string, Row[]>();
  for (const a of appointments ?? []) {
    const key = new Date(a.starts_at).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  // Aviso de recorrência: "recurrence:criadas:conflitos".
  let notice: { text: string; tone: "ok" | "warn" } | null = null;
  if (sp.notice?.startsWith("recurrence:")) {
    const [, created, conflicts] = sp.notice.split(":");
    notice = {
      text: `${created} consulta(s) criada(s); ${conflicts} semana(s) pulada(s) por conflito de agenda.`,
      tone: conflicts === "0" ? "ok" : "warn",
    };
  } else if (sp.notice && NOTICES[sp.notice]) {
    notice = NOTICES[sp.notice];
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Grade do mês: começa no domingo da semana do dia 1 (calendário pt-BR).
  const monthCells: Date[] = [];
  {
    const first = new Date(monthDate);
    first.setDate(first.getDate() - first.getDay());
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((new Date(monthDate).getDay() + daysInMonth) / 7);
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() + i);
      monthCells.push(d);
    }
  }

  const title =
    view === "month"
      ? monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : "Próximos 7 dias";

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {(
              [
                ["list", "Lista", List, "/agenda"],
                ["week", "Semana", CalendarRange, "/agenda?view=week"],
                ["month", "Mês", CalendarDays, `/agenda?view=month&month=${monthParam}`],
              ] as const
            ).map(([v, label, Icon, href]) => (
              <Link
                key={v}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </div>
          <Link href="/agenda/novo" className={buttonVariants()}>
            <Plus className="size-4" />
            Novo agendamento
          </Link>
        </div>
      </header>

      {notice && (
        <p
          className={cn(
            "mt-4 rounded-lg border px-4 py-2.5 text-sm",
            notice.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
          )}
        >
          {notice.text}
        </p>
      )}

      {requests && requests.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <h2 className="border-b border-amber-200/60 px-5 py-3 text-sm font-semibold dark:border-amber-900/60">
            Solicitações de horário ({requests.length})
          </h2>
          <ul className="divide-y divide-amber-200/60 dark:divide-amber-900/60">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{r.patient?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.preferred_starts_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {r.duration_min} min · {r.psychologist?.full_name}
                    {r.note ? ` · "${r.note}"` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={approveAppointmentRequest.bind(null, r.id)}>
                    <Button type="submit" size="sm">
                      <Check className="size-3.5" />
                      Aprovar
                    </Button>
                  </form>
                  <form action={rejectAppointmentRequest.bind(null, r.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      <X className="size-3.5" />
                      Recusar
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "month" ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Link
              href={monthLink(prevMonth)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              ← {prevMonth.toLocaleDateString("pt-BR", { month: "short" })}
            </Link>
            <Link
              href={`/agenda?view=month&month=${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Hoje
            </Link>
            <Link
              href={monthLink(nextMonth)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {nextMonth.toLocaleDateString("pt-BR", { month: "short" })} →
            </Link>
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-xl border bg-card">
            {WEEKDAY_HEADER.map((w) => (
              <div
                key={w}
                className="border-b bg-muted/50 px-2 py-1.5 text-center text-xs font-semibold capitalize text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {monthCells.map((d) => {
              const items = byDay.get(d.toDateString()) ?? [];
              const inMonth = d.getMonth() === monthDate.getMonth();
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div
                  key={d.toDateString()}
                  className={cn(
                    "min-h-24 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                    !inMonth && "bg-muted/30",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      isToday
                        ? "text-primary"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {d.getDate()}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {items.slice(0, 3).map((a) => (
                      <li
                        key={a.id}
                        className={cn(
                          "truncate rounded border-l-2 bg-background px-1 py-0.5 text-[10px]",
                          STATUS_DOT[a.status] ?? "border-l-border",
                        )}
                      >
                        {timeLabel(a.starts_at)}{" "}
                        {a.patient?.full_name?.split(" ")[0] ?? "Bloqueio"}
                      </li>
                    ))}
                    {items.length > 3 && (
                      <li className="text-[10px] text-muted-foreground">
                        +{items.length - 3} mais
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
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
                          {a.status === "blocked" && a.admin_notes
                            ? ` — ${a.admin_notes}`
                            : ""}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {a.psychologist?.full_name} ·{" "}
                          {a.modality === "online" ? "Online" : "Presencial"}
                          {a.meeting_link && (
                            <a
                              href={a.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              <Video className="size-3" />
                              sala
                            </a>
                          )}
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
