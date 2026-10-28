-- ============================================================================
-- psystem — Aceite de contrato pelo paciente (J1 complemento)
-- Prova legal do aceite: quem, quando, IP e user-agent. Append-only —
-- ninguém edita/apaga (aceite revogado seguiria outro fluxo, não edição).
-- ============================================================================

set search_path to psystem, public;

create table document_acceptances (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents (id) on delete cascade,
  patient_id   uuid not null references patients (id),
  user_id      uuid not null,                        -- auth.users (portal)
  ip           inet,
  user_agent   text,
  accepted_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (document_id)                               -- um aceite por documento
);

create index doc_accept_patient_idx on document_acceptances (patient_id);

alter table document_acceptances enable row level security;

-- Paciente registra o próprio aceite.
create policy doc_accept_insert on document_acceptances for insert
  with check (is_patient_portal_user(patient_id)
              and user_id = auth.uid());

-- Leitura: o paciente e o psicólogo responsável.
create policy doc_accept_select on document_acceptances for select
  using (is_patient_portal_user(patient_id)
         or is_responsible_psychologist(patient_id));

-- Append-only: sem update/delete para roles de aplicação.
revoke update, delete on document_acceptances from authenticated, anon;
