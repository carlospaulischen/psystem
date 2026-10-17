-- ============================================================================
-- psystem — Documentos: catálogo CFP 06/2019 + fluxo guiado
-- Adiciona modalidades que faltavam (laudo, parecer, termo), vincula declaração
-- a um atendimento da agenda e versiona o modelo usado na emissão.
-- ============================================================================

set search_path to psystem, public;

-- Modalidades regulamentadas restantes + modelos operacionais do MVP.
-- psychological_evaluation já existente cobre o registro de avaliação;
-- 'laudo' é o documento emitido a partir dela.
alter type document_type add value if not exists 'laudo';
alter type document_type add value if not exists 'opinion';
alter type document_type add value if not exists 'consent_term';

-- Declaração de comparecimento pode referenciar o atendimento da agenda
-- (data/hora/modalidade reais — nunca declara presença de consulta que não houve).
alter table documents
  add column if not exists appointment_id uuid references appointments (id);

-- Qual versão do modelo/regras gerou o conteúdo (rastreabilidade do template).
alter table documents
  add column if not exists template_version smallint not null default 1;
