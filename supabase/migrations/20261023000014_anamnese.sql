-- ============================================================================
-- psystem — Anamnese (P9): modelo editável por psicólogo + resposta pelo portal
-- Cada abordagem pergunta diferente → template por profissional. As perguntas
-- vão em snapshot no envio (editar o modelo não altera anamneses já enviadas).
-- Resposta é conteúdo clínico: só o psicólogo responsável lê.
-- ============================================================================

set search_path to psystem, public;

create table anamnesis_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  psychologist_id uuid not null references profiles (id),
  title           text not null default 'Anamnese',
  questions       jsonb not null default '[]',  -- [{ "q": "...", "type": "short|long|yesno" }]
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index anamnesis_templates_owner_idx
  on anamnesis_templates (organization_id, psychologist_id)
  where is_active;

create table anamnesis_responses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid not null references patients (id),
  psychologist_id uuid not null references profiles (id),
  questions       jsonb not null default '[]',  -- snapshot no envio
  answers         jsonb,                        -- [{ "q": "...", "a": "..." }]
  status          text not null default 'sent' check (status in ('sent', 'answered')),
  sent_by         uuid references profiles (id),
  sent_at         timestamptz not null default now(),
  answered_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index anamnesis_responses_patient_idx
  on anamnesis_responses (patient_id, status);

alter table anamnesis_templates enable row level security;
alter table anamnesis_responses enable row level security;

-- Modelos: staff lê (para gerar/enviar); cada psicólogo só edita o próprio.
create policy anamnesis_tpl_select on anamnesis_templates for select
  using (organization_id = current_org_id());

create policy anamnesis_tpl_insert on anamnesis_templates for insert
  with check (organization_id = current_org_id()
              and psychologist_id = auth.uid());

create policy anamnesis_tpl_update on anamnesis_templates for update
  using (organization_id = current_org_id()
         and psychologist_id = auth.uid())
  with check (organization_id = current_org_id()
              and psychologist_id = auth.uid());

-- Respostas: clínico — psicólogo responsável + o próprio paciente.
create policy anamnesis_resp_select on anamnesis_responses for select
  using (is_responsible_psychologist(patient_id)
         or is_patient_portal_user(patient_id));

-- Envio: somente o psicólogo responsável pelo paciente.
create policy anamnesis_resp_insert on anamnesis_responses for insert
  with check (is_responsible_psychologist(patient_id));

-- Resposta pelo paciente: apenas enquanto pendente, e só pode marcar
-- 'answered' — não reabre nem altera perguntas (colunas limitadas via grant).
revoke delete on anamnesis_templates from authenticated, anon;
revoke delete on anamnesis_responses from authenticated, anon;
revoke update on anamnesis_responses from authenticated;
grant  update (answers, status, answered_at)
       on anamnesis_responses to authenticated;

create policy anamnesis_resp_update_patient on anamnesis_responses for update
  using (is_patient_portal_user(patient_id) and status = 'sent')
  with check (is_patient_portal_user(patient_id) and status = 'answered');
