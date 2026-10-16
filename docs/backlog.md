# Backlog — PSYSTEM

> Atualizado em 2026-10-16. Organizado por prioridade e dependências.

## Bloqueados por decisão

| # | Item | Depende de |
|---|------|-----------|
| B1 | **Gateway de pagamento** (link Pix/boleto/cartão + webhook) | Escolha do provedor (Asaas, Mercado Pago, Stripe BR…) |
| B2 | **NFS-e** + Receita Saúde | Escolha do provedor (FocusNFe, eNotas, PlugNotas…) |
| B3 | **WhatsApp** para lembretes/confirmações | API oficial é paga (Meta/Twilio/Z-API) |
| B4 | **RESEND_API_KEY** real + domínio verificado | Hoje e-mails caem no fallback (`message_logs`) |
| B5 | Landing page para "psicólogo em clínica compartilhada" | Decisão de mercado — RLS já suporta (admin vê tudo, profissional só o dele) |

## Em andamento (pedidos diretos)

| # | Item | Notas |
|---|------|-------|
| A1 | **Logos vetoriais (SVG)** | PNGs perdem resolução; substituir em login, sidebar, landing, favicon |
| A2 | **Reagendamento configurável por profissional** | Opções: nunca permitir / livre / somente em janelas específicas (ex.: até 24h antes, só mesmo horário, só X dias/semana). Envolve: coluna de política no profile, validação no `rescheduleAppointment`, UI em configurações |

## Arquitetura — decisões de médio prazo

| # | Item | Notas |
|---|------|-------|
| X1 | ~~**Multi-organização**~~ ✅ | Feito 16/10: `organization_members` N:N, contexto ativo via `switch_organization()`, `create_own_practice()` para consultório individual, seletor na sidebar, convite vira vínculo para usuário existente. Bônus: grants por coluna em `profiles` fecharam bug de auto-promoção de role |

## Produto — gaps vs. concorrentes (PsicoManager / AnaM)

| # | Item | Esforço |
|---|------|---------|
| P1 | ~~**Agendamento pelo paciente**~~ ✅ | Feito 16/10 |
| P2 | ~~**Bloqueio de horário**~~ ✅ | Feito 16/10 |
| P3 | ~~**Visão mensal**~~ ✅ | Feito 16/10 |
| P4 | ~~**Link de sala virtual**~~ ✅ | Feito 16/10 |
| P2 | **Bloqueio de horário** — UI para `appointment` sem paciente (almoço, reunião) | Pequeno — schema já suporta |
| P3 | **Visão mensal** da agenda | Médio |
| P4 | **Link de sala virtual** (`meeting_link` na consulta, Google Meet/Zoom manual) | Pequeno |
| P5 | **Repasses/comissões** por profissional + relatório | Médio |
| P6 | **Relatório IRPF** — recibos anuais por paciente | Pequeno |
| P7 | **Assinatura do profissional** nos PDFs (nome + CRP + hash) | Pequeno |
| P8 | **Google Calendar sync** | Grande (OAuth) |
| P9 | **Formulários/questionários** via portal (avaliações, escalas) | Grande |
| P10 | **MFA** para contas staff | Médio |

## Importação CSV — evoluções

- Coluna `psicologo` para vincular paciente ao profissional pelo nome
- Dedupe por e-mail/CPF (atualmente importa duplicados)

## Técnico / ops

- Rotacionar o access token do Supabase (foi compartilhado em texto)
- `npm audit`: 9 findings high pendentes de revisão
- Domínio próprio (ex.: `psystem.com.br`) quando houver — Auth allow-list já suporta adicionar depois

## Feito recentemente

- Deploy Vercel + Supabase (schema `psystem` isolado do `juntae`) — 2026-10-09
- Guard no `handle_new_user` do juntae (marca `app:"psystem"`) — 2026-10-09
- Import CSV de pacientes + landing `/clinicas` — 2026-10-15
- Logos limpas (rótulos de apresentação removidos) — 2026-10-15
- Páginas de erro brandeadas (404, error, global-error) — 2026-10-15
