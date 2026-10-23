-- ============================================================================
-- psystem — Modelos de documento editáveis por org + tipo 'contract'
-- Cada organização edita o próprio contrato; placeholders {{campo}} são
-- resolvidos na geração (paciente, profissional, org, política de cancelamento).
-- ============================================================================

set search_path to psystem, public;

alter type document_type add value if not exists 'contract';

create table document_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  type            text not null,              -- 'contract' (extensível)
  name            text not null,
  body            text not null,              -- texto com placeholders {{...}}
  is_active       boolean not null default true,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index document_templates_org_idx
  on document_templates (organization_id, type)
  where is_active;

alter table document_templates enable row level security;

-- Leitura: qualquer staff da org (precisa para gerar documentos).
create policy templates_staff_select on document_templates for select
  using (organization_id = current_org_id());

-- Escrita: somente admin da org (é quem responde juridicamente pelo texto).
create policy templates_admin_insert on document_templates for insert
  with check (organization_id = current_org_id()
              and exists (
                select 1 from organization_members m
                where m.organization_id = current_org_id()
                  and m.user_id = auth.uid()
                  and m.is_admin
                  and m.status = 'active'));

create policy templates_admin_update on document_templates for update
  using (organization_id = current_org_id()
         and exists (
           select 1 from organization_members m
           where m.organization_id = current_org_id()
             and m.user_id = auth.uid()
             and m.is_admin
             and m.status = 'active'))
  with check (organization_id = current_org_id()
              and exists (
                select 1 from organization_members m
                where m.organization_id = current_org_id()
                  and m.user_id = auth.uid()
                  and m.is_admin
                  and m.status = 'active'));
