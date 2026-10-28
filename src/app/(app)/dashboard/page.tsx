import {
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
import { decideAccessRequest } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { RevenueChart, WeekChart } from "./dashboard-charts";
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

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];
const DAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function DashboardPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    { data: appointments },
    { data: weekAppointments },
    { data: openCharges },
    { data: payments },
    { data: monthAppointments },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, status, patient:patients(full_name)")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at")
      .returns<Appointment[]>(),
    supabase
      .from("appointments")
      .select("starts_at, status")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .not("status", "eq", "cancelled")
      .returns<Pick<Appointment, "starts_at" | "status">[]>(),
    supabase
      .from("charges")
      .select("amount_cents, status")
      .in("status", ["pending", "overdue"])
      .returns<Pick<Charge, "amount_cents" | "status">[]>(),
    supabase
      .from("payments")
      .select("amount_cents, paid_at")
      .gte("paid_at", sixMonthsAgo.toISOString())
      .returns<{ amount_cents: number; paid_at: string }[]>(),
    supabase
      .from("appointments")
      .select("status")
      .gte("starts_at", monthStart.toISOString())
      .lt(
        "starts_at",
        new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      )
      .returns<Pick<Appointment, "status">[]>(),
  ]);

  // Solicitações do portal — apenas dos pacientes vinculados ao psicólogo.
  let requests: {
    id: string;
    request_type: string;
    status: string;
    note: string | null;
    created_at: string;
    patient: { full_name: string } | null;
  }[] = [];
  if (profile.role === "psychologist") {
    const { data: links } = await supabase
      .from("patient_links")
      .select("patient_id")
      .eq("psychologist_id", profile.id)
      .eq("status", "active");
    const patientIds = (links ?? []).map((l) => l.patient_id);
    if (patientIds.length > 0) {
      const { data } = await supabase
        .from("access_requests")
        .select(
          "id, request_type, status, note, created_at, patient:patients(full_name)",
        )
        .in("status", ["open", "in_analysis"])
        .in("patient_id", patientIds)
        .order("created_at");
      requests = (data ?? []).map((r) => ({
        ...r,
        patient: Array.isArray(r.patient) ? (r.patient[0] ?? null) : r.patient,
      }));
    }
  }

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

  // Receita por mês — últimos 6 meses.
  const revenueByMonth = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueByMonth.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  let monthRevenue = 0;
  for (const p of payments ?? []) {
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (revenueByMonth.has(key)) {
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + p.amount_cents);
    }
    if (key === `${now.getFullYear()}-${now.getMonth()}`) {
      monthRevenue += p.amount_cents;
    }
  }
  const revenueData = [...revenueByMonth.entries()].map(([key, cents]) => ({
    month: MONTH_SHORT[Number(key.split("-")[1])],
    total: cents / 100,
  }));

  // Consultas por dia — próximos 7 dias.
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayStart);
    d.setDate(d.getDate() + i);
    const total = (weekAppointments ?? []).filter((a) => {
      const s = new Date(a.starts_at);
      return s.toDateString() === d.toDateString();
    }).length;
    return { day: `${DAY_SHORT[d.getDay()]} ${d.getDate()}`, total };
  });

  // Funil do mês.
  const monthTotal = monthAppointments?.length ?? 0;
  const monthConfirmed = (monthAppointments ?? []).filter((a) =>
    ["confirmed", "completed", "no_show"].includes(a.status),
  ).length;
  const monthCompleted = (monthAppointments ?? []).filter(
    (a) => a.status === "completed",
  ).length;
  const attendanceBase = monthCompleted + (monthAppointments ?? []).filter(
    (a) => a.status === "no_show",
  ).length;
  const attendanceRate =
    attendanceBase > 0 ? Math.round((monthCompleted / attendanceBase) * 100) : null;

  const funnel = [
    { label: "Agendadas", value: monthTotal },
    { label: "Confirmadas", value: monthConfirmed },
    { label: "Realizadas", value: monthCompleted },
  ];

  const kpis = [
    {
      label: "Hoje",
      value: String(appointments?.length ?? 0),
      hint: `agendado(s) hoje · ${weekAppointments?.length ?? 0} esta semana`,
      icon: CalendarDays,
    },
    {
      label: "Receita do mês",
      value: formatBRL(monthRevenue),
      hint: "pagamentos recebidos",
      icon: TrendingUp,
    },
    {
      label: "Em aberto",
      value: formatBRL(pendingTotal),
      hint: "em cobranças pendentes",
      icon: Wallet,
    },
    {
      label: "Pendências",
      value: String(overdueCount + awaitingConfirmation),
      hint: `${overdueCount} vencida(s) · ${awaitingConfirmation} a confirmar`,
      icon: CircleAlert,
    },
  ];

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          {now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <kpi.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">
                {kpi.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Receita</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Consultas</CardTitle>
            <CardDescription>Próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <WeekChart data={weekData} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Agenda de hoje</CardTitle>
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Funil do mês</CardTitle>
            <CardDescription>
              {attendanceRate !== null
                ? `Taxa de presença: ${attendanceRate}%`
                : "Sem atendimentos concluídos ainda"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-2">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="font-semibold tabular-nums">
                    {step.value}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width:
                        monthTotal > 0
                          ? `${Math.max((step.value / monthTotal) * 100, step.value > 0 ? 4 : 0)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
              <CalendarCheck className="mr-1.5 inline size-3.5 -translate-y-px" />
              Cancelamentos e faltas ficam fora da taxa de presença.
            </div>
          </CardContent>
        </Card>
      </div>

      {requests.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">
              Solicitações de pacientes
            </CardTitle>
            <CardDescription>
              Pedidos feitos pelo portal — a decisão é sua.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.patient?.full_name} — {r.request_type}
                    </p>
                    {r.note && (
                      <p className="truncate text-xs text-muted-foreground">
                        {r.note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form
                      action={decideAccessRequest.bind(
                        null,
                        r.id,
                        "fulfilled",
                      )}
                    >
                      <SubmitButton size="sm">
                        Atender
                      </SubmitButton>
                    </form>
                    <form
                      action={decideAccessRequest.bind(null, r.id, "denied")}
                    >
                      <SubmitButton variant="outline" size="sm">
                        Negar
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
