# Backlog — PSYSTEM

> Atualizado em 2026-10-16. Organizado por prioridade e dependências.

## Bloqueados por decisão

| # | Item | Depende de |
|---|------|-----------|
| B1 | **Gateway de pagamento** (link Pix/boleto/cartão + webhook) | Escolha do provedor (Asaas, Mercado Pago, Stripe BR…) |
| B2 | **NFS-e** + Receita Saúde | Escolha do provedor (FocusNFe, eNotas, PlugNotas…). Nota: emissão varia por município/enquadramento — integração não deve presumir emissor único; autônomo (org individual) e clínica já separam por tenant |
| B3 | **WhatsApp** para lembretes/confirmações | API oficial é paga (Meta/Twilio/Z-API) |
| B4 | **RESEND_API_KEY** real + domínio verificado | Hoje e-mails caem no fallback (`message_logs`) |
| B5 | Landing page para "psicólogo em clínica compartilhada" | Decisão de mercado — RLS já suporta (admin vê tudo, profissional só o dele) |

## Em andamento (pedidos diretos)

| # | Item | Notas |
|---|------|-------|
| A1 | **Logos vetoriais (SVG)** | PNGs perdem resolução; substituir em login, sidebar, landing, favicon |
| A2 | ~~**Reagendamento configurável por profissional**~~ ✅ | Feito 16/10: política na membership (por org), RPC própria, enforcement no reschedule, card em configurações |

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
| P5 | ~~**Repasses/comissões**~~ ✅ | Feito 16/10: `commission_pct` na membership + `/financeiro/repasses` |
| P6 | ~~**Relatório IRPF**~~ ✅ | Feito 16/10: `/financeiro/recibos` + recibo PDF anual |
| P7 | ~~**Assinatura nos PDFs**~~ ✅ | Feito 16/10: nome + CRP + hash de integridade |
| P8 | **Google Calendar sync** | Grande (OAuth) |
| P9 | **Formulários/questionários** via portal (avaliações, escalas) | Grande |
| P10 | ~~**MFA**~~ ✅ | Feito 16/10: TOTP nativo do Supabase — ativação em Configurações, gate aal2 em `requireStaff` e no login |

## Importação CSV — evoluções

- Coluna `psicologo` para vincular paciente ao profissional pelo nome
- Dedupe por e-mail/CPF (atualmente importa duplicados)

## Técnico / ops

- Rotacionar o access token do Supabase (foi compartilhado em texto)
- `npm audit`: 9 findings high pendentes de revisão
- Domínio próprio (ex.: `psystem.com.br`) quando houver — Auth allow-list já suporta adicionar depois

## Feito recentemente

- Fluxo documental CFP 06/2019 — 2026-10-16: enum com as 6 modalidades + termo de autorização, templates estruturados por tipo, regras exibidas no formulário, declaração vinculada a atendimento real da agenda, `template_version` gravado na emissão, botão em revisão

- Deploy Vercel + Supabase (schema `psystem` isolado do `juntae`) — 2026-10-09
- Guard no `handle_new_user` do juntae (marca `app:"psystem"`) — 2026-10-09
- Import CSV de pacientes + landing `/clinicas` — 2026-10-15
- Logos limpas (rótulos de apresentação removidos) — 2026-10-15
- Páginas de erro brandeadas (404, error, global-error) — 2026-10-15
