# Matriz de Conformidade — Etapa 1

Status: ATENDIDO COM EVIDÊNCIA · PARCIAL · NÃO ATENDIDO · NÃO VERIFICADO

## LGPD

| ID | Requisito | Status | Evidência / Lacuna |
|---|---|---|---|
| L-01 | Isolamento multi-tenant | ATENDIDO | RLS `organization_id = current_org_id()` em todas as tabelas (migrations 01–16); schema `psystem` dedicado |
| L-02 | Controle de acesso por perfil | ATENDIDO | `member_role` 3 níveis + `is_responsible_psychologist` + `is_patient_portal_user` — RLS não UI |
| L-03 | Dados clínicos restritos | ATENDIDO | `clinical_records`, `anamnesis_responses` — só psicólogo responsável + paciente; recepção/admin bloqueados |
| L-04 | Auditoria de acesso | PARCIAL | `audit_logs` append-only + `PRONTUARIO_LIDO`/`DOCUMENTO_LIDO` (leitura auditada 27/10); **falta** log de acesso a anexos/downloads |
| L-05 | Direitos do titular | PARCIAL | `/api/meus-dados` exporta cadastro; `data_correction` via access_requests; **falta** fluxo de eliminação/anonimização com retenção CFP |
| L-06 | Transparência/privacidade | NÃO ATENDIDO | Sem Política de Privacidade, Termos, DPA, avisos de coleta |
| L-07 | Retenção/descarte | PARCIAL | Aceites/prontuários append-only; **falta** política de retenção documentada + descarte após prazo legal |
| L-08 | Transferência internacional | PARCIAL | Banco em sa-east-1 (Brasil); Vercel/CDN nos EUA → requer cláusulas no DPA |
| L-09 | Incidente de segurança | NÃO ATENDIDO | Sem plano de resposta/comunicação ANPD |
| L-10 | MFA contas privilegiadas | ATENDIDO | TOTP + `aal2` enforcement em requireStaff |
| L-11 | Suporte com acesso a dados | ATENDIDO | Acesso suporte ≤2h, `app_metadata.support_until`, `SUPORTE_ACESSO` auditado (28/10) |

## Segurança técnica

| ID | Requisito | Status | Evidência / Lacuna |
|---|---|---|---|
| S-01 | Autorização no backend | ATENDIDO | RLS em toda tabela + `requireStaff`/`requirePlatformAdmin` em actions — não é só UI |
| S-02 | IDOR/BOLA | ATENDIDO | `.single()` + RLS por recurso; verify links com `token_hash` — `PGRST201` corrigido com FK pin |
| S-03 | Anti-enumeração | ATENDIDO | Reset de senha sempre retorna ok (sem revelar se e-mail existe) |
| S-04 | Headers de segurança | **NÃO ATENDIDO** | Sem CSP, X-Frame-Options, HSTS, X-Content-Type-Options em `next.config.ts`/proxy |
| S-05 | Rate limiting | **NÃO ATENDIDO** | Nenhum throttle em login/recuperar/portal — brute force viável |
| S-06 | Testes de segurança | **NÃO ATENDIDO** | **0 testes automatizados** — isolamento RLS sem prova regressível |
| S-07 | Segredos | ATENDIDO | Service key só em `admin.ts` server-side; envs na Vercel; `backups/` gitignored |
| S-08 | Upload de arquivos | PARCIAL | `patient_attachments` com `file_path` no bucket; **não verifiquei** validação de tipo/tamanho/conteúdo |
| S-09 | Sessões | ATENDIDO | Cookies Supabase SSR httpOnly; logout global; suporte ≤2h forçado |

## CFP / profissional

| ID | Requisito | Status | Evidência / Lacuna |
|---|---|---|---|
| C-01 | Registro documental | ATENDIDO | `clinical_records` versionados (não apaga — nova versão) |
| C-02 | Sigilo profissional | ATENDIDO | RLS por responsável; recepção sem acesso clínico |
| C-03 | Documentos com autoria | ATENDIDO | `documents` com hash + `document_versions` + `document_deliveries` rastreadas |
| C-04 | Anamnese | ATENDIDO | Snapshot de perguntas no envio; paciente só edita `answers` enquanto `sent` |
| C-05 | Aceite/contrato | ATENDIDO | `document_acceptances` com IP+UA+timestamp — prova legal |
| C-06 | Validação profissional | NÃO VERIFICADO | Templates/cláusulas precisam revisão da psicóloga responsável |
| C-07 | Atendimento online | PARCIAL | `modality` online/presencial existe; falta adequação específica Res. 009/2024 |

## Confiança/continuidade

| ID | Requisito | Status | Evidência / Lacuna |
|---|---|---|---|
| T-01 | Backups automáticos | NÃO ATENDIDO | Supabase **Free** — sem PITR; snapshots manuais em `backups/` (dev local) |
| T-02 | Restore testado | NÃO ATENDIDO | Nunca restaurado em produção |
| T-03 | Monitoramento | NÃO ATENDIDO | Sem Sentry, uptime, alertas de erro |
| T-04 | CI/CD | PARCIAL | Deploy via CLI manual; sem pipeline de testes |
| T-05 | Ambientes separados | PARCIAL | Dev local + prod; sem staging |

## Funcional (amostra)

| ID | Módulo | Status |
|---|---|---|
| F-01 | Agenda + políticas | ATENDIDO — agendamento, cancelamento c/ janela, no-show billing, reagendamento |
| F-02 | Prontuário versionado | ATENDIDO |
| F-03 | Documentos CFP + contrato | ATENDIDO — tipos, revisão, emissão, entrega, aceite |
| F-04 | Financeiro | PARCIAL — cobranças/faturas ok; sem gateway (B1), sem NFS-e (B2) |
| F-05 | Portal paciente | ATENDIDO — consultas, solicitações, docs, anamnese, contrato, privacidade |
| F-06 | Onboarding de tenant | ATENDIDO — `/admin/organizacoes` cria org + convida admin |
| F-07 | Multi-org por usuário | ATENDIDO — memberships + seletor de contexto |
| F-08 | Google Calendar | NÃO ATENDIDO — P8 pendente (OAuth) |
