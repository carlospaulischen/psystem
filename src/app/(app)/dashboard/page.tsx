import { connection } from "next/server";
import { CalendarDays, CircleAlert, FileText, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Appointment, Charge } from "@/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function DashboardPage() {
  await connection(); // new Date() abaixo é dado de runtime (Next 16)
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [{ data: appointments }, { data: openCharges }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, patient:patients(full_name)")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at")
      .returns<Appointment[]>(),
    supabase
      .from("charges")
      .select("amount_cents, status")
      .in("status", ["pending", "overdue"])
      .returns<Pick<Charge, "amount_cents" | "status">[]>(),
  ]);

  const pendingTotal = (openCharges ?? []).reduce(
    (sum, c) => sum + c.amount_cents,
    0,
  );
  const overdueCount = (openCharges ?? []).filter(
    (c) => c.status === "overdue",
  ).length;
  const awaitingConfirmation = (appointments ?? []).filter(
    (a) => a.status === "awaiting_confirmation",
  ).length;

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Hoje</CardDescription>
            <CalendarDays className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {appointments?.length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              atendimento(s) agendado(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Em aberto</CardDescription>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatBRL(pendingTotal)}</p>
            <p className="text-xs text-muted-foreground">
              em cobranças pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Pendências</CardDescription>
            <CircleAlert className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {overdueCount + awaitingConfirmation}
            </p>
            <p className="text-xs text-muted-foreground">
              {overdueCount} vencida(s) · {awaitingConfirmation} aguardando
              confirmação
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            Agenda de hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <ul className="divide-y divide-border">
              {appointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span>
                    <span className="font-medium tabular-nums">
                      {formatTime(a.starts_at)}
                    </span>
                    <span className="mx-2 text-muted-foreground">—</span>
                    {a.patient?.full_name ?? "Bloqueio"}
                  </span>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum atendimento hoje.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
