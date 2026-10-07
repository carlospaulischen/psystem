# PRD — Sistema de Gestão para Psicólogos e Clínicas (MVP)

> Posicionamento: **"A plataforma que cuida da rotina administrativa do psicólogo, do agendamento ao recebimento, sem deixar o prontuário e os documentos espalhados."**

O produto não é "um sistema de agendamento" — agendamento sozinho é commodity. O diferencial é conectar, em um único fluxo:

```
Agenda → Prontuário → Cobrança → Pagamento → Nota fiscal → Documento → Comunicação
```

Segurança, sigilo, controle de acesso e rastreabilidade são **requisitos do produto desde o primeiro dia** (ver `compliance-matrix.md` e `permissions-matrix.md`).

## Fluxo principal

```
Paciente → Agendamento → Atendimento → Prontuário → Cobrança → Pagamento → Nota fiscal
Paciente → Prontuário → Documento/Encaminhamento → PDF → envio ao paciente
```

## Perfis de usuário

### Psicólogo
- Agenda própria; cadastrar/editar pacientes; registrar atendimentos; consultar prontuários
- Emitir documentos; cadastrar valores; acompanhar pagamentos
- Emitir/solicitar NFS-e; enviar cobranças; configurar mensagens

### Administrador da clínica
- Cadastrar psicólogos e salas; agenda da clínica; cadastrar pacientes
- Financeiro, cobranças, configurações, relatórios administrativos
- **Não tem acesso automático ao conteúdo clínico do prontuário**

### Recepção/secretária
- Agendar, cancelar/remarcar, cadastrar paciente, confirmar consulta
- Informações administrativas, cobranças, pagamentos
- **Não acessa conteúdo clínico do prontuário**

### Paciente
- Acesso simples via portal/link seguro (não app próprio no MVP)
- Confirmar consulta, visualizar agendamento, receber cobrança, acessar NFS-e e documentos disponibilizados
- **Sem acesso direto ao prontuário** — solicitações passam por fluxo controlado pelo profissional

## Módulos

### 1. Agenda (coração comercial)

Visão diária/semanal: horário, paciente, psicólogo, sala, modalidade (presencial/online), status.

Status: 🟢 Agendada · 🔵 Confirmada · 🟡 Aguardando confirmação · ⚫ Realizada · 🔴 Cancelada · 🟠 Faltou

Disponibilidade: psicólogo define janelas por dia da semana (ex.: Seg 08–12, 14–18) e o sistema gera os slots.

Regras de impedimento:
- Dois pacientes no mesmo horário (mesmo psicólogo)
- Dois psicólogos na mesma sala
- Horários fora da disponibilidade
- Horário bloqueado

### 2. Pacientes (ficha única)

Dados: nome, CPF, nascimento, telefone, e-mail, endereço, contato de emergência, responsável legal (quando aplicável), observações administrativas.

Histórico unificado na ficha: próximas consultas · consultas anteriores · prontuário · documentos · encaminhamentos · cobranças · notas fiscais.

### 3. Prontuário (conservador no MVP)

Estrutura: Identificação · Demanda inicial · Objetivos · Registros de atendimento · Encaminhamentos · Encerramento.

Cada registro de atendimento: data, tipo, evolução, procedimentos/condutas, observações.

**Versionamento obrigatório**: edição cria nova versão; nunca sobrescrever nem apagar silenciosamente.

### 4. Financeiro

Por atendimento: valor + status (🟢 Pago · 🟡 Pendente · 🔴 Vencido · ⚪ Cancelado).

Visão do psicólogo: atendimentos, faturamento, recebido, pendente por período.

### 5. Cobrança automática

Canais: WhatsApp + e-mail. Configurável por tipo: confirmação, lembrete de consulta, cobrança, lembrete de pagamento, nota fiscal.

### 6. Pagamento

**Não construir gateway próprio.** Sistema gera cobrança → link de pagamento; gateway confirma via webhook → status atualiza automaticamente.

### 7. Nota fiscal

**Não construir emissor NFS-e próprio.** Integração com um único provedor (ex.: eNotas, FocusNFe, NFE.io):

```
Atendimento realizado → Pagamento confirmado → "Emitir nota" → API → NFS-e autorizada → PDF/XML armazenado → envio ao paciente
```

### 8. WhatsApp / comunicação

Central de comunicação (confirmação, lembrete, cobrança, pagamento confirmado, documento disponível).

**Nunca expor conteúdo clínico em mensagens.** Preferir "Você possui uma nova comunicação da sua clínica" + link seguro.

### 9. Documentos e encaminhamentos

Gerador com templates controlados por modalidade (CFP Res. 06/2019): Declaração, Atestado, Relatório, Relatório multiprofissional, Laudo, Parecer, Encaminhamento.

Workflow: `RASCUNHO → EM_REVISÃO → EMITIDO → ENTREGUE`. Emitido não é editável — alteração gera nova versão. Finalidade é campo obrigatório. Entrega gera comprovante (versão, destinatário, data, canal).

Encaminhamento é documento específico, **não** exportação do prontuário.

### 10. Clínicas (multi-tenant desde o dia 1)

```
Plataforma
├── Clínica A (psicólogos, recepção, salas, pacientes)
├── Clínica B
└── Psicólogo autônomo (organização individual)
```

Modelo de receita: R$/psicólogo/mês ou R$/clínica + usuários.

## Dashboard (tela inicial)

```
Hoje — 06/10/2026
Agenda de hoje: 09:00 Maria · 10:00 João · 14:00 Carlos · 15:00 Fernanda
Financeiro: R$ 12.450 faturado · R$ 9.850 recebido · R$ 2.600 pendente
Pendências: 4 cobranças vencidas · 3 aguardando confirmação · 2 documentos
```

## Estrutura do banco (visão)

```
organizations ── clinics ── users ── psychologists ── receptionists
patients ── rooms ── appointments
clinical_records ── clinical_record_entries (+ versions)
documents (+ versions) ── referrals
charges ── payments ── invoices
message_logs ── audit_logs ── access_requests
```

## Segurança obrigatória no MVP

Criptografia em trânsito e em repouso · autenticação segura + recuperação · 2FA para profissionais · controle de sessão · permissões por função + vínculo · logs de acesso e alteração · backups · política de retenção · segregação entre clínicas · exportação · exclusão/anonimização quando juridicamente aplicável · **LGPD desde o desenho**.

## O que NÃO entra no MVP

App do paciente · teleconsulta própria · IA/análise de sessão · transcrição · testes psicológicos · marketplace · convênios · contabilidade completa · gestão financeira empresarial · estoque · folha · prontuário multiprofissional complexo · múltiplos gateways de pagamento/NFS-e.

## Escopo do MVP V1

1. Login e usuários (psicólogo, admin, recepção)
2. Clínica (dados, profissionais, salas)
3. Pacientes (cadastro, histórico)
4. Agenda (calendário, disponibilidade, agendamento, cancelamento, remarcação)
5. Prontuário (demanda, objetivos, registros, histórico versionado, encerramento)
6. Documentos (templates básicos, PDF, workflow)
7. Financeiro (valor, cobrança, status, pagamento)
8. Comunicação (WhatsApp, e-mail)
9. NFS-e (um provedor)
10. Segurança (permissões, auditoria, backup, logs)

## Roadmap

- **Fase 1 (MVP)**: escopo acima
- **V2**: portal completo do paciente, assinatura digital, PIX integrado, recorrência, pacotes de sessões, relatórios/indicadores, lista de espera, confirmação automática
- **V3**: teleatendimento, app, convênios, marketplace, IA, transcrição, prontuário multiprofissional

## Referências normativas

- Código de Ética Profissional do Psicólogo — CFP
- Resolução CFP nº 001/2009 — registro documental
- Resolução CFP nº 006/2019 — documentos escritos
- Manual Orientativo de Registro e Elaboração de Documentos Psicológicos — CFP, 2025
- LGPD
