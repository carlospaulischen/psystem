import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  FileText,
  Landmark,
  Lock,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gestão para psicólogos e clínicas",
  description:
    "Agenda, prontuário protegido, financeiro e portal do paciente em uma plataforma segura, feita para a prática clínica.",
};

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Agenda inteligente",
    description:
      "Consultas diárias e semanais, confirmação, remarcação e controle de salas — sem conflitos de horário.",
  },
  {
    icon: ScrollText,
    title: "Prontuário protegido",
    description:
      "Registros clínicos versionados e com acesso restrito ao psicólogo responsável. Histórico preservado sempre.",
  },
  {
    icon: Users,
    title: "Gestão de pacientes",
    description:
      "Cadastro completo, responsáveis legais, vínculos por profissional e situação do acompanhamento.",
  },
  {
    icon: Wallet,
    title: "Financeiro integrado",
    description:
      "Cobranças por consulta, status de pagamento, lembretes e emissão de nota fiscal em um só lugar.",
  },
  {
    icon: FileText,
    title: "Documentos e encaminhamentos",
    description:
      "Declarações, atestados e encaminhamentos emitidos com conteúdo controlado e assinatura do profissional.",
  },
  {
    icon: MessageCircle,
    title: "Portal do paciente",
    description:
      "O paciente acompanha consultas e pagamentos por um portal seguro, sem acesso a informações clínicas.",
  },
];

const AUDIENCE = [
  {
    title: "Psicólogos autônomos",
    description:
      "Organize agenda, prontuário e cobranças sem depender de planilhas e aplicativos genéricos.",
  },
  {
    title: "Clínicas e equipes",
    description:
      "Recepção, administração e corpo clínico em um único sistema, cada um vendo apenas o necessário.",
  },
  {
    title: "Pacientes",
    description:
      "Acesso simples e seguro às próprias consultas e pagamentos, com privacidade garantida.",
  },
];

const SECURITY = [
  {
    icon: Lock,
    title: "Sigilo por construção",
    description:
      "O prontuário clínico é inacessível até para administradores e recepção. Apenas o psicólogo responsável pelo paciente tem acesso.",
  },
  {
    icon: ShieldCheck,
    title: "Conformidade com LGPD e CFP",
    description:
      "Controle de acesso por perfil e vínculo, registros imutáveis e trilha de auditoria de todas as ações sensíveis.",
  },
  {
    icon: Landmark,
    title: "Dados no Brasil",
    description:
      "Infraestrutura com região em São Paulo, criptografia em repouso e em trânsito, e políticas aplicadas no banco de dados.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/psystem/symbol-128.png"
              alt="PSYSTEM"
              width={30}
              height={30}
              className="size-7"
              priority
            />
            <span className="text-lg font-semibold tracking-wide">
              PSYSTEM
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#funcionalidades" className="hover:text-foreground">
              Funcionalidades
            </a>
            <a href="#seguranca" className="hover:text-foreground">
              Segurança
            </a>
            <a href="#publico" className="hover:text-foreground">
              Para quem é
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
          className="pointer-events-none absolute -top-32 -left-32 size-[480px] rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-24 size-[420px] rounded-full bg-[#14b8a6]/15 blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-24 text-center md:py-32">
          <Image
            src="/brand/psystem/logo.png"
            alt="PSYSTEM — Tecnologia para saúde mental"
            width={520}
            height={430}
            className="w-56 md:w-72 h-auto"
            priority
          />
          <h1 className="mt-10 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            A gestão da sua clínica, com o sigilo que a psicologia exige
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Agenda, prontuário, financeiro e portal do paciente em uma
            plataforma segura — feita para psicólogos, clínicas e quem
            confia o cuidado a eles.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className={buttonVariants({ size: "lg" })}
            >
              Acessar a plataforma
            </Link>
            <a
              href="#funcionalidades"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Conhecer funcionalidades
            </a>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Tudo o que a rotina clínica precisa
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Do primeiro contato ao recibo: o fluxo completo da prática em um
            único sistema.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-background p-6"
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

      {/* Segurança */}
      <section id="seguranca" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Segurança e ética
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Sigilo profissional não é uma opção — é arquitetura
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Informações clínicas são separadas das administrativas e
                protegidas por regras aplicadas diretamente no banco de
                dados — não apenas escondidas na interface. Cada acesso
                sensível fica registrado em uma trilha de auditoria
                imutável.
              </p>
            </div>
            <ul className="flex flex-col gap-5">
              {SECURITY.map((s) => (
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

      {/* Público */}
      <section id="publico" className="border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Para quem é
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-border bg-background p-6 text-center"
              >
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {a.description}
                </p>
              </div>
            ))}
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
            Comece a organizar sua prática hoje
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Acesse a plataforma e veja agenda, pacientes, prontuário e
            financeiro trabalhando juntos.
          </p>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", className: "mt-8" })}
          >
            Entrar no PSYSTEM
          </Link>
        </div>
      </section>

      {/* Footer */}
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
          <p>Feito com respeito ao sigilo profissional.</p>
        </div>
      </footer>
    </main>
  );
}
