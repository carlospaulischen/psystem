import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  CalendarDays,
  Landmark,
  Lock,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = {
  title: "Para clínicas de psicologia",
  description:
    "Agenda compartilhada, recepção, financeiro e permissões por profissional — gestão completa para clínicas com vários psicólogos.",
};

const CLINIC_FEATURES = [
  {
    icon: CalendarDays,
    title: "Agenda compartilhada",
    description:
      "Visão de toda a equipe em um só lugar: consultas por profissional, salas e modalidade, sem conflito de horário.",
  },
  {
    icon: UserCheck,
    title: "Recepção e equipe",
    description:
      "Recepcionistas agendam e acompanham cobranças sem nunca abrir um prontuário clínico.",
  },
  {
    icon: ShieldCheck,
    title: "Permissões por profissional",
    description:
      "Cada psicólogo vê apenas os próprios pacientes e prontuários. O vínculo define o acesso — no banco, não na tela.",
  },
  {
    icon: Wallet,
    title: "Financeiro centralizado",
    description:
      "Cobranças, pagamentos e status por paciente e por profissional, com exportação para a contabilidade.",
  },
  {
    icon: ScrollText,
    title: "Prontuários protegidos",
    description:
      "Registros clínicos versionados e inacessíveis até para a administração — só o psicólogo responsável lê.",
  },
  {
    icon: Building2,
    title: "Portal do paciente",
    description:
      "O paciente confirma consulta, acompanha pagamentos e recebe documentos — sem ligar para a recepção.",
  },
];

const PAIN_POINTS = [
  "Planilhas de agenda que ninguém confia",
  "Prontuário em pasta compartilhada ou papel",
  "Cobrança controlada no WhatsApp",
  "Sem visão de quem atendeu quem e quando",
];

export default function ClinicasPage() {
  return (
    <main className="flex-1 bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/psystem/logo-horizontal.png"
              alt="PSYSTEM"
              width={463}
              height={145}
              className="h-12 w-auto"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-foreground">
              Para psicólogos
            </Link>
            <a href="#gestao" className="hover:text-foreground">
              Gestão
            </a>
            <a href="#seguranca" className="hover:text-foreground">
              Sigilo
            </a>
          </nav>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-40 size-[560px] rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-20 -right-32 size-[480px] rounded-full bg-[#14b8a6]/15 blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-20 md:py-28 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Para clínicas e equipes
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Mais cuidado. Menos burocracia.{" "}
              <span className="text-primary">Tudo conectado.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Da agenda ao prontuário. Dos documentos aos pagamentos. Uma
              plataforma para simplificar a rotina da sua clínica e facilitar a
              jornada de cada paciente.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Acessar a plataforma
              </Link>
              <a
                href="#gestao"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Ver como funciona
              </a>
            </div>
            <dl className="mt-10 flex gap-8 text-sm">
              <div>
                <dt className="text-muted-foreground">Equipe</dt>
                <dd className="font-semibold">multi-perfil</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Agenda</dt>
                <dd className="font-semibold">compartilhada</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sigilo</dt>
                <dd className="font-semibold">por construção</dd>
              </div>
            </dl>
          </div>

          {/* Mockup — agenda da clínica */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -top-8 -right-6 size-64 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative rounded-3xl border border-border/70 bg-card p-2 shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs text-muted-foreground">
                  psystem.app/agenda — equipe
                </span>
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between pb-1">
                  <p className="text-sm font-semibold">Clínica — hoje</p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    3 profissionais
                  </span>
                </div>
                {[
                  { t: "09:00", n: "Dra. Ana", p: "Maria Silva", s: "confirmed" },
                  { t: "10:00", n: "Dr. Bruno", p: "João Pereira", s: "confirmed" },
                  { t: "14:00", n: "Dra. Ana", p: "Fernanda Costa", s: "awaiting_confirmation" },
                  { t: "15:00", n: "Recepção", p: "Sala 2 — livre", s: "scheduled" },
                ].map((r) => (
                  <div
                    key={r.t + r.n}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-11 text-sm font-medium tabular-nums">
                        {r.t}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{r.n}</p>
                        <p className="text-xs text-muted-foreground">{r.p}</p>
                      </div>
                    </div>
                    <StatusBadge status={r.s} />
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-xl shadow-primary/10 md:-left-10">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#14b8a6]/10 text-[#0f766e]">
                <Users className="size-4" />
              </div>
              <div className="text-sm">
                <p className="font-semibold">12 pacientes confirmados</p>
                <p className="text-xs text-muted-foreground">
                  pelo portal, sem telefonema
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dores */}
      <section className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                O problema
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                A clínica cresceu — e a organização ficou para trás
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Quando cada profissional se vira com suas próprias ferramentas,
                a clínica perde o controle do todo: agenda fragmentada, cobrança
                informal, prontuário exposto.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {PAIN_POINTS.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4 text-sm"
                >
                  <span className="size-2 shrink-0 rounded-full bg-destructive/60" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Gestão */}
      <section id="gestao" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Uma plataforma, cada perfil no seu lugar
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Administração, recepção e corpo clínico trabalham no mesmo sistema —
            cada um vendo apenas o que precisa.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CLINIC_FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sigilo */}
      <section id="seguranca" className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Sigilo e ética
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                O prontuário é do paciente — e do psicólogo dele
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Em muitos sistemas, quem administra a clínica também lê
                prontuários. No PSYSTEM isso é impossível por arquitetura: as
                regras de acesso vivem no banco de dados e toda ação sensível
                fica registrada em auditoria imutável.
              </p>
            </div>
            <ul className="flex flex-col gap-5">
              {[
                {
                  icon: Lock,
                  title: "Separação clínico × administrativo",
                  description:
                    "Administração e recepção veem dados administrativos — nunca conteúdo clínico.",
                },
                {
                  icon: ShieldCheck,
                  title: "LGPD e CFP por construção",
                  description:
                    "Acesso por perfil e vínculo, registros imutáveis, consentimento rastreado.",
                },
                {
                  icon: Landmark,
                  title: "Dados no Brasil",
                  description:
                    "Infraestrutura em São Paulo, criptografia em repouso e em trânsito.",
                },
              ].map((s) => (
                <li key={s.title} className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#14b8a6]/10 text-[#0f766e]">
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto size-[560px] rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight">
            Traga sua equipe para uma gestão só
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Cadastre a clínica, convide a equipe e importe seus pacientes de uma
            planilha em minutos.
          </p>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", className: "mt-8" })}
          >
            Começar agora
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/psystem/symbol-128.png"
              alt=""
              width={20}
              height={20}
              className="size-5"
            />
            <span className="font-medium text-foreground">PSYSTEM</span>
            <span>· Tecnologia para saúde mental</span>
          </div>
          <Link href="/" className="hover:text-foreground">
            Sou psicólogo(a) autônomo →
          </Link>
        </div>
      </footer>
    </main>
  );
}
