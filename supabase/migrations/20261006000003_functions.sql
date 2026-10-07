-- ============================================================================
-- psystem — Funções de domínio e auditoria
-- ============================================================================

-- ---------------------------------------------------------------------------
-- add_entry_version: única forma de escrever conteúdo em registro clínico.
-- Cria a versão e avança latest_version atomicamente (ET-004/005).
--   - v1: change_reason opcional
--   - v2+: change_reason obrigatório (motivo da alteração)
-- ---------------------------------------------------------------------------

create or replace function add_entry_version(
  p_entry_id      uuid,
  p_content       text,
  p_procedures    text default null,
  p_change_reason text default null
)
returns record_entry_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry   record_entries;
  v_version integer;
  v_row     record_entry_versions;
begin
  select * into v_entry from record_entries where id = p_entry_id;
  if not found then
    raise exception 'entry_not_found';
  end if;

  -- Autorização: somente psicólogo com vínculo ativo ao paciente do prontuário.
  if not exists (
    select 1 from clinical_records r
    where r.id = v_entry.record_id
      and is_responsible_psychologist(r.patient_id)
  ) then
    raise exception 'forbidden';
  end if;

  v_version := v_entry.latest_version + 1;

  -- Primeira versão é criada por create_record_entry(); aqui só v2+.
  if v_version >= 2 and (p_change_reason is null or btrim(p_change_reason) = '') then
    raise exception 'change_reason_required';
  end if;

  insert into record_entry_versions (entry_id, version, content, procedures, change_reason, author_id)
  values (p_entry_id, v_version, p_content, p_procedures, p_change_reason, auth.uid())
  returning * into v_row;

  update record_entries set latest_version = v_version where id = p_entry_id;

  perform log_audit(
    v_entry.organization_id,
    'record_entry', p_entry_id, 'REGISTRO_EDITADO',
    jsonb_build_object('version', v_version)
  );

  return v_row;
end $$;

-- ---------------------------------------------------------------------------
-- create_record_entry: cria a entry já com a versão 1.
-- ---------------------------------------------------------------------------

create or replace function create_record_entry(
  p_record_id      uuid,
  p_appointment_id uuid,
  p_entry_type     entry_type,
  p_content        text,
  p_procedures     text default null
)
returns record_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record clinical_records;
  v_entry  record_entries;
begin
  select * into v_record from clinical_records where id = p_record_id;
  if not found then
    raise exception 'record_not_found';
  end if;

  if not is_responsible_psychologist(v_record.patient_id) then
    raise exception 'forbidden';
  end if;

  insert into record_entries (organization_id, record_id, appointment_id, author_id, entry_type)
  values (v_record.organization_id, p_record_id, p_appointment_id, auth.uid(), p_entry_type)
  returning * into v_entry;

  insert into record_entry_versions (entry_id, version, content, procedures, author_id)
  values (v_entry.id, 1, p_content, p_procedures, auth.uid());

  perform log_audit(
    v_record.organization_id,
    'record_entry', v_entry.id, 'REGISTRO_CRIADO',
    jsonb_build_object('record_id', p_record_id)
  );

  return v_entry;
end $$;

-- ---------------------------------------------------------------------------
-- log_audit: helper único para trilha de auditoria (ET-017).
-- Chamado por funções do banco e pela aplicação (service role ou authenticated).
-- ---------------------------------------------------------------------------

create or replace function log_audit(
  p_organization_id uuid,
  p_resource_type   text,
  p_resource_id     uuid,
  p_action          text,
  p_metadata        jsonb default '{}'::jsonb,
  p_patient_id      uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into audit_logs (organization_id, user_id, patient_id, resource_type, resource_id, action, metadata)
  values (p_organization_id, auth.uid(), p_patient_id, p_resource_type, p_resource_id, p_action, p_metadata)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Bloqueio de UPDATE/DELETE em tabelas imutáveis (defesa em profundidade:
-- grants já revogam; o trigger torna o erro explícito).
-- ---------------------------------------------------------------------------

create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'immutable_table: % does not allow %', tg_table_name, tg_op;
end $$;

create trigger record_entry_versions_immutable
  before update or delete on record_entry_versions
  for each row execute function forbid_mutation();

create trigger document_versions_immutable
  before update or delete on document_versions
  for each row execute function forbid_mutation();

create trigger audit_logs_immutable
  before update or delete on audit_logs
  for each row execute function forbid_mutation();

-- Documento emitido não pode ter conteúdo/status regressado para rascunho
-- sem criar nova versão (ET-013).
create or replace function guard_document_status()
returns trigger language plpgsql as $$
begin
  if old.status in ('issued', 'delivered')
     and new.status in ('draft', 'in_review') then
    raise exception 'issued_document_is_immutable';
  end if;
  return new;
end $$;

create trigger documents_status_guard
  before update on documents
  for each row execute function guard_document_status();
