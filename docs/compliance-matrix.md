# Matriz de Conformidade Ética e Regras de Negócio

> Transforma requisitos éticos, técnicos e de confidencialidade (CFP/CRP + LGPD) em regras funcionais e técnicas do sistema.
>
> **Premissa:** o sistema auxilia o profissional no cumprimento das normas, mas não substitui sua responsabilidade técnica e ética. Esta matriz não substitui revisão jurídica/ética antes da produção.

## 1. Princípios estruturantes

Sigilo por padrão · menor privilégio · necessidade de acesso · finalidade determinada · rastreabilidade · versionamento · não sobrescrever registros clínicos · não excluir silenciosamente · compartilhamento mínimo necessário · separação entre informação administrativa e clínica · responsabilidade profissional preservada · privacidade desde o desenho.

## 2. Distinção fundamental de conceitos

| Conceito | Descrição | Acesso do paciente |
|---|---|---|
| **Prontuário** | Registro do acompanhamento; direito do usuário solicitá-lo | Via fluxo formal de solicitação |
| **Registro documental** | Informações cujo compartilhamento pode precisar ser restringido | Conforme análise profissional |
| **Documentos psicológicos** | Declaração, atestado, relatório, laudo etc. (Res. 06/2019) | Documento destinado a ele é entregue |

Regra: **não** modelar como "paciente nunca pode acessar o prontuário" — modelar como "sem acesso direto; solicitação passa por fluxo controlado pelo profissional responsável".

## 3. Matriz principal

| ID | Tema | Regra de negócio | Comportamento do sistema | Auditoria | Prioridade |
|---|---|---|---|---|---|
| ET-001 | Sigilo | Informações clínicas só acessíveis a autorizados | Bloqueio por perfil + vínculo | Tentativa e acesso | P0 |
| ET-002 | Prontuário | Sem acesso direto do paciente ao ambiente interno | Portal separado do prontuário | Solicitações | P0 |
| ET-003 | Solicitação de acesso | Paciente pode solicitar registros/documentos | Fluxo formal → análise do profissional | Solicitação, decisão, entrega | P0 |
| ET-004 | Registro clínico | Não apagar nem sobrescrever silenciosamente | Versionamento | Versões e autor | P0 |
| ET-005 | Correção | Correções preservam histórico | Nova versão + motivo | Autor, data, motivo | P0 |
| ET-006 | Acesso administrativo | Admin da clínica ≠ acesso clínico | Permissões separadas | Tentativas | P0 |
| ET-007 | Recepção | Só informações da função administrativa | Bloquear prontuário/evolução | Acessos | P0 |
| ET-008 | Outro psicólogo | Mesma clínica ≠ acesso automático | Exigir vínculo/autorização | Acesso | P0 |
| ET-009 | Compartilhamento | Mínimo necessário à finalidade | Seleção de documento/info antes do envio | Destinatário, finalidade, data | P0 |
| ET-010 | Equipe multiprofissional | Só informações necessárias ao objetivo | Finalidade + revisão antes de emitir | Documento e destinatário | P0 |
| ET-011 | Documentos | Modalidade e estrutura apropriadas | Templates por tipo | Autor e versão | P0 |
| ET-012 | Finalidade | Documento exige finalidade identificada | Campo obrigatório | Finalidade | P0 |
| ET-013 | Emissão | Documento emitido não é alterado silenciosamente | Bloquear edição após emissão | Versões | P0 |
| ET-014 | Entrega | Registrar versão entregue | Comprovante de entrega | Data, destinatário, versão | P0 |
| ET-015 | Comunicação | Sem conteúdo clínico em WhatsApp/e-mail | Mensagens neutras | Envio | P0 |
| ET-016 | Encaminhamento | Não é compartilhar prontuário inteiro | Documento específico | Destinatário e finalidade | P0 |
| ET-017 | Auditoria | Acesso clínico rastreável | Log automático | Usuário, ação, data/hora | P0 |
| ET-018 | Exclusão | Encerrar ≠ apagar | Arquivar/inativar | Data e responsável | P0 |
| ET-019 | Usuário desligado | Perde acesso sem apagar registros | Inativar usuário | Data do desligamento | P0 |
| ET-020 | Menores | Representação legal e legislação aplicável | Responsável + vínculo + restrições | Responsável | P0 |
| ET-021 | Gravação | Exige tratamento específico e consentimento | Não habilitar por padrão | Consentimento e finalidade | Futuro |
| ET-022 | Pesquisa | Reuso de dados exige controles próprios | Sem reutilização automática | Finalidade/autorização | Futuro |
| ET-023 | Supervisão | Compartilhamento controlado | Fluxo específico | Destinatário/finalidade | V2 |
| ET-024 | Exportação | Ação sensível | Confirmação + permissão + motivo | Arquivo, usuário, data | P0 |
| ET-025 | Download | Documentos clínicos rastreáveis | Registrar download | Usuário, arquivo, data | P0 |
| ET-026 | Impressão/PDF | Geração de PDF clínico rastreável | Registrar geração | Usuário, documento | V2 |
| ET-027 | Segurança | Proteção contra acesso não autorizado | Criptografia, auth, sessões, permissões | Logs de segurança | P0 |
| ET-028 | Separação | Administrativo e clínico com níveis diferentes | Permissões por módulo/campo | Acesso | P0 |
| ET-029 | Clínica | Clínica não acessa dados de outra | Isolamento por organização | Logs | P0 |
| ET-030 | Psicólogo autônomo | Ambiente isolado | Organização individual | Logs | P0 |

## 4. Fluxo de solicitação do paciente

```
Paciente solicita acesso
  → Sistema cria solicitação (tipo, período, observação)
  → Psicólogo responsável notificado
  → Profissional analisa
  → Decisão: Atender | Orientar | Elaborar documento | Outra providência
  → Registro da decisão → Entrega → Comprovante
```

Registrado: quem solicitou, data, quem analisou, decisão, documento/versão entregue, data da entrega. **O sistema não decide sozinho o conteúdo a entregar** — fornece ferramentas para a análise profissional.

## 5. Versionamento obrigatório

```
Registro ── v1 ── v2 ── v3 (atual)
```

Cada versão: autor, data/hora, conteúdo, motivo da alteração, versão anterior. Não existe "editar registro antigo" — existe "criar nova versão".

## 6. Regra de "não apagar"

| Objeto | Proibido | Correto |
|---|---|---|
| Paciente | `DELETE` | Inativar/arquivar |
| Psicólogo | `DELETE` | Inativar usuário |
| Registro clínico | `DELETE` | Versionar |
| Documento emitido | `DELETE` | Invalidar/revogar mantendo histórico |

## 7. Eventos mínimos de auditoria

`LOGIN` `LOGOUT` `LOGIN_FALHO` `PACIENTE_VISUALIZADO` `PRONTUARIO_ABERTO` `REGISTRO_CRIADO` `REGISTRO_EDITADO` `DOCUMENTO_CRIADO` `DOCUMENTO_EMITIDO` `DOCUMENTO_VISUALIZADO` `DOCUMENTO_BAIXADO` `DOCUMENTO_COMPARTILHADO` `EXPORTACAO_REALIZADA` `SOLICITACAO_DE_ACESSO` `SOLICITACAO_ANALISADA` `PACIENTE_ARQUIVADO` `USUARIO_INATIVADO`

Cada evento: `timestamp, user_id, organization_id, patient_id?, resource_type, resource_id, action, ip/device, resultado`. Logs protegidos contra alteração.

## 8. Comunicação — regra de conteúdo

✅ "Olá, Maria. Há uma nova mensagem da sua clínica. Acesse seu portal."
❌ "Sua sessão para tratamento de ansiedade está confirmada."

Nunca inserir automaticamente: diagnóstico, motivo do atendimento, conteúdo de sessão, dados de prontuário.

## 9. Decisões que o sistema NÃO automatiza

O sistema **não decide**: quebra de sigilo, conteúdo entregue em situações excepcionais, diagnóstico, conteúdo técnico de laudo, necessidade de encaminhamento/gravação, adequação de conclusão.

O sistema pode: **alertar → solicitar confirmação → registrar decisão → preservar evidência.**

## 10. Alertas de conformidade (não bloqueantes)

- ⚠️ "Este documento será enviado a terceiro. Verifique se contém apenas informações necessárias."
- ⚠️ "Este paciente possui outro profissional responsável. Verifique autorização/vínculo."
- ⚠️ "Você está alterando um registro emitido. Uma nova versão será criada."

## 11. Versionamento normativo

Cada regra possui: ID, norma, artigo/item, versão da norma, data de validação, regra de negócio, implementação, responsável pela validação. A matriz é versionada no repositório — alteração normativa gera revisão classificada (sem impacto → interface → regra de negócio → banco → crítico).

## 12. Regra de ouro

> **"A informação deve estar disponível somente para quem precisa dela, para a finalidade para a qual ela é necessária, pelo período necessário, e toda utilização relevante deve ser rastreável."**
