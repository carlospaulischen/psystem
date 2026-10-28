# Registro de Riscos + Plano de Remediação — Etapa 1

## Registro de riscos (priorizado)

### R-01 — Ausência total de testes automatizados
- **Severidade:** ALTO · **Módulo:** todo · **Tipo:** vulnerabilidade plausível
- **Evidência:** `find src -name '*.test.*'` → 0 arquivos; nenhuma suíte vitest/playwright
- **Cenário:** uma refatoração de RLS ou action quebra isolamento silenciosamente → vazamento cross-tenant em produção sem alerta
- **Impacto:** técnico (regressão), jurídico (incidente LGPD sem detecção)
- **Correção:** vitest + suíte de autorização: usuário org-A não lê patient da org-B; recepção não lê `clinical_records`; paciente só vê próprios dados; `PGRST201`-style embeds testados
- **Aceite:** ≥15 casos de isolamento passando em CI
- **Regressão:** suíte roda em todo PR
- **Esforço:** 1–2 dias

### R-02 — Headers de segurança ausentes
- **Severidade:** ALTO · **Módulo:** app todo · **Tipo:** vulnerabilidade plausível
- **Evidência:** `next.config.ts`/`src/proxy.ts` sem CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- **Cenário:** clickjacking na tela de login; MIME sniffing em upload de anexo; XSS sem barreira de CSP
- **Correção:** `headers()` no `next.config.ts` ou no proxy: CSP restritiva (Supabase + fonts), `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`
- **Aceite:** `curl -I` retorna os 5 headers em produção
- **Esforço:** horas

### R-03 — Sem rate limiting
- **Severidade:** ALTO · **Módulo:** auth + portal · **Tipo:** vulnerabilidade plausível
- **Evidência:** `grep rate` → nada; login/recuperar/`/api/meus-dados` sem throttle
- **Cenário:** brute force em senha de staff; enumeração em massa via `/recuperar`; spam de `data_correction`
- **Correção:** Upstash Ratelimit ou in-memory + IP; limitar login (5/min), recuperar (3/5min), portal actions
- **Aceite:** 6ª tentativa de login em 1 min → 429
- **Esforço:** horas–1 dia

### R-04 — Documentos legais inexistentes (LGPD sensível)
- **Severidade:** ALTO · **Módulo:** produto/contrato · **Tipo:** obrigação legal
- **Evidência:** nenhuma política de privacidade/termos/DPA no app ou site
- **Cenário:** paciente não sabe finalidade/base legal; clínica sem DPA com a plataforma (operador); sem encarregado/DPO
- **Correção:** advogado → Política de Privacidade, Termos de Uso, DPA (clínica=controladora, SaaS=operador), página de direitos, encarregado nomeado
- **Aceite:** `/privacidade` + `/termos` públicos + DPA assinável + contato do encarregado
- **Dependência:** jurídico externo · **Esforço:** dias–semanas

### R-05 — Backup/restore e monitoramento inexistentes
- **Severidade:** ALTO · **Módulo:** infra · **Tipo:** vulnerabilidade plausível
- **Evidência:** Supabase **Free** (sem PITR); snapshot manual em `backups/` só local; nenhum restore testado; sem Sentry/uptime
- **Cenário:** migration destrutiva ou exclusão acidental → perda de prontuários sem recuperação; app fora do ar sem ninguém saber
- **Correção:** Supabase Pro (~$25/mês) + PITR; cron de restore-test mensal; Sentry nos server actions + uptime check
- **Aceite:** restore de um ponto no tempo bem-sucedido + alerta de erro em produção
- **Esforço:** horas de config + assinatura

### R-06 — Anexos sem validação de conteúdo
- **Severidade:** MÉDIO · **Módulo:** pacientes · **Tipo:** pendência de verificação
- **Evidência:** `patient_attachments` aceita upload; não verifiquei restrição de MIME/tamanho/varredura
- **Cenário:** paciente/staff sobe executável disfarçado de PDF → download malicioso
- **Correção:** whitelist MIME + tamanho máx + assinatura de URL privada
- **Aceite:** upload de `.exe` → rejeitado

### R-07 — Fluxo de eliminação/anonimização do titular ausente
- **Severidade:** MÉDIO · **Módulo:** LGPD · **Tipo:** obrigação legal parcial
- **Evidência:** `/api/meus-dados` exporta, `data_correction` existe; **não há** "excluir meus dados" — necessário porque retenção CFP ≠ retenção da plataforma
- **Correção:** fluxo "solicitar encerramento" → anonimiza PII preservando registros clínicos obrigatórios (5 anos CFP)
- **Esforço:** 1–2 dias

### R-08 — Acesso a anexos não auditado
- **Severidade:** MÉDIO · **Módulo:** auditoria · **Tipo:** lacuna parcial
- **Evidência:** `PRONTUARIO_LIDO`/`DOCUMENTO_LIDO` cobrem página; download de `patient_attachments` não gera log
- **Correção:** `ANEXO_BAIXADO` no handler de download

### R-09 — Resend/Auth: sem SSO ou rotação de tokens
- **Severidade:** BAIXO · **Módulo:** ops · **Tipo:** higiene
- **Evidência:** tokens Supabase/Resend passaram em texto na sessão
- **Correção:** rotacionar ambos

### R-10 — Dados demo em produção
- **Severidade:** BAIXO · **Módulo:** produção · **Tipo:** higiene
- **Evidência:** Clínica Demo + 10 pacientes seed ativos
- **Correção:** remover antes de paciente real

## Plano de remediação

| Prioridade | Itens |
|---|---|
| **P0 — bloqueia go-live** | R-02 headers · R-03 rate limit · R-05 backups+monitoramento · R-04 docs legais |
| **P1 — antes de comercializar** | R-01 testes de isolamento · R-06 validação de anexos · R-07 fluxo de eliminação |
| **P2 — logo após** | R-08 log de anexo · R-09 rotação · R-10 limpeza demo |
| **P3 — evolutivo** | WAF Cloudflare · staging · pentest |

## Pendências externas (H)

- **Advogado:** política, termos, DPA, encarregado/DPO, cláusulas de transferência internacional
- **Andressa (CFP):** validar modelos de documento, contrato, anamnese, regras de atendimento online
- **Contador:** NFS-e/emissão fiscal quando B2 avançar
- **Fornecedores:** Google Cloud (P8), gateway de pagamento, WhatsApp provider — DPAs de cada um

## Decisões que precisam do responsável

1. Supabase Pro agora ou no primeiro cliente pagante?
2. Advocacia para docs legais — contratar ou usar modelo revisável?
3. Dados demo saem de produção quando — antes do 1º paciente real?
4. `p=none` → `p=quarantine` no DMARC depois de monitorar?

## ADRs sugeridas

- ADR-001: separação prontuário/notas privadas/documentos (acesso/finalidade distintos)
- ADR-002: retenção = 5 anos clínico (CFP) + descarte de PII administrativa sob demanda
- ADR-003: acesso suporte sempre via impersonation ≤2h auditado — nunca senha compartilhada
- ADR-004: camada regulatória por profissão se sair de psicologia
