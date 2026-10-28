# Auditoria — Executive Summary

**Data:** 2026-10-28 · **Tipo:** Etapa 1 — diagnóstico read-only
**Escopo:** repositório psystem (Next.js 16.4.3 + Supabase Postgres/Auth/RLS/Storage, Vercel, Resend, Cloudflare)

## Veredito

**NÃO PRONTO para go-live comercial**, mas a fundação técnica está **acima da média para MVP**: RLS em todas as tabelas, isolamento multi-tenant por schema+org, auditoria de leitura clínica, aceite de contrato com prova legal, direitos do titular no portal, MFA aal2, acesso suporte temporário e auditado. As lacunas que bloqueiam o lançamento são concentradas em **confiabilidade (backups/testes), documentação legal (LGPD) e observabilidade** — não em falhas de arquitetura.

## Os 5 maiores riscos

| # | Risco | Severidade |
|---|---|---|
| R-01 | **Zero testes automatizados** — nenhuma prova regressível de isolamento/RLS | ALTO |
| R-02 | **Sem headers de segurança** (CSP, X-Frame-Options, HSTS) no Next/Vercel | ALTO |
| R-03 | **Sem rate limiting** em login/recuperação/portal → brute force viável | ALTO |
| R-04 | **Documentos legais ausentes** — LGPD é sensível (saúde): sem Política, Termos, DPA, encarregado | ALTO |
| R-05 | **Sem backup/restore testado + sem monitoramento** (Supabase Free, sem PITR, sem Sentry) | ALTO |

## Estado por frente

| Frente | Status |
|---|---|
| Regulatório/jurídico | PARCIAL — base técnica ok; docs legais inexistentes |
| Segurança/privacidade | PARCIAL — RLS+audit fortes; faltam headers, rate limit, testes |
| Operação do profissional | ATENDIDO COM EVIDÊNCIA (agenda, prontuário, docs, financeiro, portal) |
| Confiabilidade técnica | NÃO ATENDIDO — sem backup testado, monitoramento, restore |
| Governança de produto | PARCIAL — camada SaaS criada; falta docs + fornecedores |

## Limites da análise

- Não executei testes de invasão — análise de código + configuração
- Supabase/Vercel/Cloudflare verificados via API/console, não via pentest
- Requisitos CFP confirmados por validação profissional (Andressa) — pendente

## Checklist go-live (resumo)

- [ ] Headers de segurança + rate limiting implementados
- [ ] ≥15 testes de isolamento/RLS automatizados
- [ ] Supabase Pro + PITR + restore testado
- [ ] Sentry + uptime check
- [ ] Política de privacidade, termos, DPA (advogado)
- [ ] Andressa valida templates clínicos/documentais
- [ ] Tokens rotacionados; dados demo fora de produção
