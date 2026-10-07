# Matriz de Perfis, Telas e Permissões

> Especificação de controle de acesso para implementação. Base: RBAC + ABAC.

## 1. Perfis

| Perfil | Escopo |
|---|---|
| `platform_admin` | Operação técnica do SaaS. **Sem acesso a conteúdo clínico por padrão.** |
| `clinic_admin` | Administra a organização (usuários, salas, config, financeiro) |
| `psychologist` | Atendimento e registros clínicos dos pacientes sob sua responsabilidade |
| `receptionist` | Atividades administrativas (agenda, cadastro, cobrança) |
| `patient` | Portal externo apenas — nunca ambiente interno |

Perfil `financeiro` pode surgir depois. **O backend usa perfis + permissões granulares**, não perfis fixos — uma clínica pode ter recepcionista com acesso ao financeiro e outra só à agenda.

## 2. Regra fundamental de autorização

Não basta `usuário.role === X`. A decisão considera:

```
USUÁRIO + ORGANIZAÇÃO + PERFIL + VÍNCULO COM PACIENTE + TIPO DE DADO + FINALIDADE + AÇÃO
```

Ex.: psicólogo **responsável** pelo paciente acessa o prontuário; outro psicólogo da mesma clínica, não.

## 3. Níveis de acesso

| Código | Nível | Significado |
|---|---|---|
| N0 | Nenhum | Não acessa |
| N1 | Consulta | Visualiza |
| N2 | Operacional | Cria/edita dados administrativos |
| N3 | Clínico | Cria/edita dados clínicos |
| N4 | Administrativo | Usuários e configurações |
| N5 | Auditoria | Consulta logs |
| N6 | Sistema | Operação da plataforma |

## 4. Matriz geral de módulos

| Módulo | Platform Admin | Clinic Admin | Psicólogo | Recepção | Paciente |
|---|---|---|---|---|---|
| Dashboard | N6 | N4 | N3 | N2 | N1 |
| Agenda | N6 | N4 | N3 | N2 | N1 (própria) |
| Pacientes | N6 | N2 | N3 | N2 | N1 (próprio) |
| Prontuário | N0 | N0 | N3 | N0 | N0* |
| Documentos psicológicos | N0 | N0 | N3 | N0 | N1* |
| Encaminhamentos | N0 | N0 | N3 | N0 | N1* |
| Financeiro | N6 | N4 | N2 | N2 | N1 |
| Notas fiscais | N6 | N4 | N2 | N2 | N1 |
| Comunicação | N6 | N4 | N3 | N2 | N1 |
| Usuários | N6 | N4 | N0 | N0 | N0 |
| Clínica | N6 | N4 | N1 | N1 | N0 |
| Relatórios administrativos | N6 | N4 | N2 | N1 | N0 |
| Auditoria | N6 | N5 | N1** | N0 | N0 |
| Configurações | N6 | N4 | N2 | N1 | N0 |

\* Somente via fluxo de solicitação/entrega.
\** Apenas próprios eventos.

## 5. Agenda

| Ação | Clinic Admin | Psicólogo | Recepção | Paciente |
|---|---|---|---|---|
| Ver agenda da clínica | ✅ | ❌ (só própria/vínculo) | ✅ | ❌ |
| Criar agendamento | ✅ | ✅ | ✅ | solicitação |
| Alterar horário / cancelar | ✅ | ✅ | ✅ | solicitação |
| Bloquear horário | ✅ | ✅ | conforme permissão | ❌ |
| Definir disponibilidade | ❌ | ✅ | conforme permissão | ❌ |
| Cadastrar sala | ✅ | ❌ | ❌ | ❌ |
| Ver valor da consulta | ✅ | ✅ | ✅ | próprio |
| Ver conteúdo clínico | ❌ | ❌ | ❌ | ❌ |

## 6. Ficha do paciente (abas)

| Aba | Psicólogo | Recepção | Admin | Paciente |
|---|---|---|---|---|
| Dados pessoais | ✅ | ✅ | ✅ | próprio |
| Agenda | ✅ | ✅ | ✅ | própria |
| Financeiro | ✅ | ✅ | ✅ | próprio |
| Prontuário | ✅ | ❌ | ❌ | fluxo de solicitação |
| Documentos | ✅ | ❌ | ❌ | disponibilizados |
| Histórico de acessos | conforme política | ❌ | eventos administrativos | ❌ |

## 7. Campos sensíveis

| Campo | Psicólogo | Recepção | Admin | Paciente |
|---|---|---|---|---|
| Nome, telefone, e-mail | ✅ | ✅ | ✅ | próprio |
| CPF, endereço, responsável | ✅ | conforme necessidade | conforme necessidade | próprio |
| Valor / status pagamento | ✅ | ✅ | ✅ | próprio |
| Demanda clínica, evolução, registro | ✅ | ❌ | ❌ | fluxo de solicitação |
| Documento psicológico, encaminhamento | ✅ | ❌ | ❌ | se disponibilizado |

## 8. Prontuário — regras de acesso

- **Psicólogo responsável**: abrir, criar registro, versionar, documentos, encaminhamento, encerrar.
- **Outro psicólogo**: negado por padrão; transferência formal encerra vínculo anterior e cria novo.
- **Recepção / Admin**: bloqueado total. Ser dono da clínica não concede acesso clínico.
- Sem "Excluir prontuário" nem "Excluir registro" — arquivar/inativar/versionar.

## 9. Documentos — workflow

```
RASCUNHO → EM_REVISÃO → EMITIDO → ENTREGUE
```

Rascunho/revisão editáveis; emitido/entregue bloqueados (alteração = nova versão). Tipos MVP: Declaração, Atestado, Relatório, Relatório multiprofissional, Laudo, Encaminhamento — cada um com formulário próprio e campo **finalidade obrigatório**.

## 10. Ações críticas com auditoria obrigatória

Abrir prontuário · criar/alterar registro · criar/emitir/baixar/compartilhar documento · exportar prontuário · atender solicitação · transferir paciente · encerrar acompanhamento · inativar psicólogo · alterar permissões · acesso excepcional.

## 11. Exportação/download

Operação de alto risco: exige motivo + confirmação + permissão específica. Registra usuário, paciente, dados, motivo, data/hora, formato, destinatário. Não existe botão padrão "enviar prontuário completo" — exportação integral passa por fluxo específico auditado.

## 12. Ciclo de vida

- **Paciente**: `ATIVO → PAUSADO → ENCERRADO → ARQUIVADO` (encerrar ≠ excluir)
- **Usuário**: `CONVITE → ATIVO → BLOQUEADO → INATIVO` (desligar psicólogo bloqueia login, preserva autoria/registros)
- **Documento**: `RASCUNHO → EM_REVISÃO → EMITIDO → ENTREGUE → INVALIDADO`
- **Solicitação**: `ABERTA → EM_ANÁLISE → ATENDIDA | NEGADA | CANCELADA`
- **Transferência de paciente**: encerra vínculo antigo, cria novo; histórico íntegro, sem duplicar prontuário

## 13. Platform admin — acesso excepcional

Suporte opera via logs/metadados. Se acesso a dados for inevitável: motivo obrigatório + autorização + prazo limitado + escopo limitado + auditoria + registro de encerramento.

## 14. Tentativas de acesso indevido

`403` + log (usuário, data/hora, recurso, ação, resultado NEGADO). Comportamento anômalo gera alerta de segurança.

## 15. Requisito de backend

Permissões validadas no backend/banco — esconder botão não basta. Com Supabase: **RLS em todas as tabelas** = a regra vive no Postgres, protegendo inclusive acesso direto via API.

```
Pode acessar paciente? → Pode acessar recurso? → Pode executar ação? → SIM: executa / NÃO: 403
```

## 16. Critérios de aceite (testes P0)

1. Recepção abre prontuário → negado + log
2. Admin abre evolução → negado + log
3. Psicólogo A abre paciente do B → negado
4. Editar registro antigo → nova versão, original preservado
5. Paciente solicita documento → chega ao profissional responsável
6. Alterar documento emitido → obriga nova versão
7. Recepção envia cobrança → funciona sem acessar prontuário
8. WhatsApp → sem informação clínica automática
9. Psicólogo desligado → login bloqueado, registros preservados
10. Novo psicólogo → sem acesso automático a pacientes existentes
11. Clínica A acessa paciente da Clínica B → impossível
12. Exportar prontuário → permissão + motivo + auditoria
