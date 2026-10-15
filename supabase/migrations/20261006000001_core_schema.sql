-- ============================================================================
-- psystem — Core schema (multi-tenant)
-- Conformidade: docs/compliance-matrix.md, docs/permissions-matrix.md
-- Princípios: isolamento por organização, nada é deletado, registros clínicos
-- versionados, separação administrativo/clínico.
-- ============================================================================

-- O projeto Supabase é compartilhado com outro produto que já usa o schema
-- public. Tudo do psystem vive no schema dedicado 'psystem' — zero colisão.
create schema if not exists psystem;
set search_path = psystem, public;

grant usage on schema psystem to anon, authenticated, service_role;
alter default privileges in schema psystem
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema psystem
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema psystem
  grant all on functions to anon, authenticated, service_role;

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_type as enum ('clinic', 'individual');
create type member_role as enum ('clinic_admin', 'psychologist', 'receptionist');
create type member_status as enum ('invited', 'active', 'blocked', 'inactive');
create type patient_status as enum ('active', 'paused', 'closed', 'archived');
create type link_status as enum ('active', 'transferred', 'ended');
create type appointment_status as enum (
  'scheduled', 'awaiting_confirmation', 'confirmed',
  'completed', 'cancelled', 'no_show', 'blocked'
);
create type appointment_modality as enum ('in_person', 'online');
create type record_status as enum ('active', 'closed', 'archived');
create type entry_type as enum ('demand', 'objectives', 'session', 'procedure', 'closing', 'note');
create type document_type as enum (
  'declaration', 'certificate', 'report',
  'multiprofessional_report', 'psychological_evaluation', 'referral', 'other'
);
create type document_status as enum ('draft', 'in_review', 'issued', 'delivered', 'invalidated');
create type charge_status as enum ('pending', 'paid', 'overdue', 'cancelled');
create type invoice_status as enum ('requested', 'processing', 'issued', 'failed', 'cancelled');
create type access_request_status as enum ('open', 'in_analysis', 'fulfilled', 'denied', 'cancelled');
create type message_channel as enum ('whatsapp', 'email');

-- ---------------------------------------------------------------------------
-- Tenancy & users
-- ---------------------------------------------------------------------------

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  type        org_type not null default 'clinic',
  name        text not null,
  slug        text not null unique,
  document    text,                    -- CNPJ/CPF
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Perfil do usuário interno (staff). Pacientes não entram aqui — ver patient_accounts.
create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id),
  role            member_role not null,
  status          member_status not null default 'invited',
  full_name       text not null,
  crp             text,                 -- registro profissional (psicólogos)
  is_platform_admin boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_org_idx on profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------

create table patients (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations (id),
  full_name         text not null,
  cpf               text,
  birth_date        date,
  phone             text,
  email             text,
  address           jsonb,
  emergency_contact jsonb,
  guardian          jsonb,              -- responsável legal (ET-020)
  status            patient_status not null default 'active',
  admin_notes       text,               -- APENAS observações administrativas
  created_by        uuid references profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  archived_at       timestamptz
);

create index patients_org_idx on patients (organization_id);

-- Conta do paciente no portal (sem acesso ao ambiente interno).
create table patient_accounts (
  patient_id  uuid primary key references patients (id),
  user_id     uuid not null unique references auth.users (id),
  created_at  timestamptz not null default now()
);

-- Vínculo paciente ↔ psicólogo (ABAC: base do acesso clínico — ET-008).
create table patient_links (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid not null references patients (id),
  psychologist_id uuid not null references profiles (id),
  status          link_status not null default 'active',
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now()
);

-- Um único vínculo ativo por paciente (responsável único).
create unique index patient_links_one_active
  on patient_links (patient_id) where status = 'active';
create index patient_links_psych_idx on patient_links (psychologist_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

create table rooms (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  name            text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table availability (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  psychologist_id uuid not null references profiles (id),
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  check (end_time > start_time)
);

create table appointments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid references patients (id),          -- null em bloqueio
  psychologist_id uuid not null references profiles (id),
  room_id         uuid references rooms (id),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  modality        appointment_modality not null default 'in_person',
  status          appointment_status not null default 'scheduled',
  price_cents     integer,
  admin_notes     text,
  created_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Sem dois pacientes no mesmo horário do psicólogo.
  exclude using gist (
    psychologist_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelled')),
  -- Sem dois psicólogos na mesma sala.
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (room_id is not null and status not in ('cancelled'))
);

create index appointments_org_time_idx on appointments (organization_id, starts_at);
create index appointments_patient_idx on appointments (patient_id);

-- ---------------------------------------------------------------------------
-- Clinical records (prontuário) — versionado, nunca sobrescreve (ET-004/005)
-- ---------------------------------------------------------------------------

create table clinical_records (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid not null unique references patients (id),
  status          record_status not null default 'active',
  demand_summary  text,                 -- demanda inicial
  objectives      text,
  closed_at       timestamptz,
  closed_by       uuid references profiles (id),
  created_at      timestamptz not null default now()
);

create table record_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  record_id       uuid not null references clinical_records (id),
  appointment_id  uuid references appointments (id),
  author_id       uuid not null references profiles (id),
  entry_type      entry_type not null default 'session',
  latest_version  integer not null default 1,
  created_at      timestamptz not null default now()
  -- Sem updated_at: o entry é imutável; conteúdo vive em record_entry_versions.
);

-- Versões do registro. INSERT apenas — UPDATE/DELETE revogados via RLS/grant.
create table record_entry_versions (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references record_entries (id),
  version       integer not null,
  content       text not null,
  procedures    text,
  change_reason text,                   -- obrigatório a partir da v2 (check na app + trigger)
  author_id     uuid not null references profiles (id),
  created_at    timestamptz not null default now(),
  unique (entry_id, version)
);

-- ---------------------------------------------------------------------------
-- Documents (documentos psicológicos — Res. CFP 006/2019)
-- ---------------------------------------------------------------------------

create table documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations (id),
  patient_id        uuid not null references patients (id),
  author_id         uuid not null references profiles (id),
  type              document_type not null,
  purpose           text not null,      -- finalidade obrigatória (ET-012)
  recipient_name    text,
  recipient_service text,
  status            document_status not null default 'draft',
  current_version   integer not null default 1,
  created_at        timestamptz not null default now()
);

create table document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents (id),
  version      integer not null,
  content      text not null,
  storage_path text,                    -- PDF em Storage após emissão
  created_by   uuid not null references profiles (id),
  issued_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

-- Comprovante de entrega (ET-014): versão, destinatário, canal, data.
create table document_deliveries (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents (id),
  version      integer not null,
  delivered_to text not null,
  channel      text not null,           -- 'portal', 'email', 'print'
  delivered_by uuid not null references profiles (id),
  delivered_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Financial
-- ---------------------------------------------------------------------------

create table charges (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id),
  patient_id       uuid not null references patients (id),
  appointment_id   uuid references appointments (id),
  amount_cents     integer not null check (amount_cents >= 0),
  status           charge_status not null default 'pending',
  due_date         date,
  gateway          text,                -- adapter: 'asaas', 'mercadopago', ...
  gateway_id       text,
  payment_link_url text,
  created_by       uuid references profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index charges_org_status_idx on charges (organization_id, status);

create table payments (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id),
  charge_id          uuid not null references charges (id),
  gateway            text not null,
  gateway_payment_id text,
  amount_cents       integer not null,
  method             text,              -- 'pix', 'credit_card', 'boleto', ...
  paid_at            timestamptz,
  raw                jsonb,             -- payload do webhook
  created_at         timestamptz not null default now()
);

create table invoices (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id),
  charge_id           uuid not null references charges (id),
  payment_id          uuid references payments (id),
  provider            text not null,    -- adapter: 'enotas', 'focusnfe', ...
  provider_invoice_id text,
  status              invoice_status not null default 'requested',
  number              text,
  pdf_path            text,
  xml_path            text,
  issued_at           timestamptz,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Patient access requests (ET-003) & communication logs (ET-015)
-- ---------------------------------------------------------------------------

create table access_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid not null references patients (id),
  requested_by    uuid references auth.users (id),        -- conta do portal
  request_type    text not null,                          -- 'records', 'document', ...
  period          text,
  note            text,
  status          access_request_status not null default 'open',
  decided_by      uuid references profiles (id),
  decided_at      timestamptz,
  decision_note   text,
  created_at      timestamptz not null default now()
);

create table message_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid references patients (id),
  channel         message_channel not null,
  template_key    text not null,        -- 'appointment_confirmation', 'charge_reminder', ...
  recipient       text not null,
  status          text not null default 'queued',  -- queued|sent|failed|delivered
  provider        text,
  provider_id     text,
  related_type    text,                 -- 'appointment', 'charge', 'document'
  related_id      uuid,
  sent_by         uuid references profiles (id),   -- null = automático
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log (ET-017) — append-only, ver migration 0003
-- ---------------------------------------------------------------------------

create table audit_logs (
  id              bigint generated always as identity primary key,
  organization_id uuid references organizations (id),
  user_id         uuid,
  patient_id      uuid,
  resource_type   text not null,
  resource_id     uuid,
  action          text not null,
  result          text not null default 'allowed',   -- 'allowed' | 'denied'
  metadata        jsonb not null default '{}'::jsonb,
  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index audit_logs_org_time_idx on audit_logs (organization_id, created_at desc);
create index audit_logs_patient_idx on audit_logs (patient_id);
create index audit_logs_resource_idx on audit_logs (resource_type, resource_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger patients_updated_at before update on patients
  for each row execute function set_updated_at();
create trigger appointments_updated_at before update on appointments
  for each row execute function set_updated_at();
create trigger charges_updated_at before update on charges
  for each row execute function set_updated_at();
