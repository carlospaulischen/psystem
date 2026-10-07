import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { AppointmentStatusMenu } from "./status-menu";
import { buttonVariants } from "@/components/ui/button";
import type { Appointment } from "@/types";

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

export default async function AgendaPage() {
  await requireStaff();
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
    .returns<(Appointment & { psychologist: { full_name: string } | null })[]>();

  // Agrupa por dia para a visão de agenda.
  const byDay = new Map<string, NonNullable<typeof appointments>>();
  for (const a of appointments ?? []) {
    const key = new Date(a.starts_at).toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  return (
    <div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">Próximos 7 dias</p>
        </div>
        <Link href="/agenda/novo" className={buttonVariants()}>
          <Plus className="size-4" />
          Novo agendamento
        </Link>
      </header>

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
                      <AppointmentStatusMenu appointmentId={a.id} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
