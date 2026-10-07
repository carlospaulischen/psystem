# psystem

Sistema de gestão para psicólogos e clínicas: agenda, pacientes, prontuário, financeiro, documentos, cobranças e nota fiscal — com controle de acesso e rastreabilidade por construção.

**Stack:** Next.js 16 (Vercel) · Supabase (Postgres + Auth + Storage + Edge Functions + pg_cron, região `sa-east-1`) · TypeScript · Tailwind v4.

## Documentação do produto

| Doc | Conteúdo |
|---|---|
| [`docs/prd.md`](docs/prd.md) | Escopo do MVP, módulos, roadmap, o que fica de fora |
| [`docs/compliance-matrix.md`](docs/compliance-matrix.md) | Regras éticas CFP/LGPD → comportamento do sistema |
| [`docs/permissions-matrix.md`](docs/permissions-matrix.md) | Perfis × telas × ações, critérios de aceite |

As matrizes são a especificação viva do produto — alterações nelas exigem revisão antes do código.

## Setup local

```bash
npm install
cp .env.example .env.local   # preencher chaves
npx supabase start           # sobe Postgres/Auth local (requer Docker)
npx supabase db reset        # aplica migrations + seed
npm run dev
```

Depois de criar o primeiro usuário no Auth (Dashboard → Authentication), vincule-o a um perfil:

```sql
insert into profiles (id, organization_id, role, status, full_name)
values ('<auth_user_id>', '00000000-0000-0000-0000-000000000001',
        'clinic_admin', 'active', 'Seu Nome');
```

## Arquitetura

```
src/
├── proxy.ts               # Next 16: sessão + gate de autenticação (ex-middleware)
├── app/
│   ├── (auth)/login       # login staff
│   ├── (app)/             # área interna: dashboard, agenda, pacientes, financeiro...
│   ├── (portal)/portal    # portal do paciente (sem dados clínicos)
│   └── auth/callback      # magic link / convites
├── lib/supabase/          # client (browser) · server · admin (service role)
├── lib/auth.ts            # getSessionProfile / requireStaff
└── lib/audit.ts           # log_audit (trilha ET-017)

supabase/
├── migrations/            # schema + RLS + funções de domínio
├── functions/             # edge functions: send-message, payment-webhook, issue-invoice
└── seed.sql
```

## Decisões estruturais (por quê)

- **Permissões no banco (RLS), não na UI.** Recepção/admin não possuem policy sobre `clinical_records`, `record_entries`, `documents` — o acesso é negado pelo Postgres, não por esconder botão. Vínculo ativo `patient_links` é a base do ABAC clínico.
- **Registro clínico é append-only.** Conteúdo vive em `record_entry_versions`; edição = nova versão via `add_entry_version()` (exige `change_reason`). `UPDATE`/`DELETE` revogados + trigger de imutabilidade.
- **Nada é deletado.** Pacientes arquivados, usuários inativados, consultas canceladas por status, documentos invalidados.
- **`audit_logs` append-only** para todas as ações sensíveis.
- **Integrações via adapters.** WhatsApp, e-mail, pagamento e NFS-e são edge functions com contrato estável — o provedor se pluga depois sem mudar o domínio.
- **Jobs agendados no Supabase** (`pg_cron` + edge functions), não em Vercel Cron — funciona em qualquer plano e sem limite de timeout curto.

## Ordem de construção (ver docs/prd.md)

1. ✅ Fundação: multi-tenant, auth, RLS, versionamento, audit
2. Pacientes + agenda (CRUD)
3. Prontuário (registros versionados)
4. Documentos + PDF
5. Financeiro + cobranças + webhook
6. WhatsApp/e-mail + jobs
7. NFS-e
8. Portal do paciente + solicitações de acesso
9. Central de conformidade/auditoria

## Nota de conformidade

Este sistema manipula dados pessoais sensíveis (LGPD art. 11 — saúde). Antes de produção: revisão jurídica/ética das matrizes, DPA com Supabase/provedores, projeto Supabase em `sa-east-1`, backups/PITR habilitados.
