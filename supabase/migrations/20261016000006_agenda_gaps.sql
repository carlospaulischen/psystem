-- Agenda: link de sala virtual + solicitações de horário pelo portal
set search_path to psystem, public;

-- Link de sala virtual (Google Meet/Zoom informado manualmente pelo staff)
alter table appointments
  add column if not exists meeting_link text;

-- Solicitação de horário pelo paciente (P1): o portal pede, o staff aprova.
-- Fica em tabela própria para não "segurar" o horário na agenda
-- (a constraint de conflito só vale para appointments reais).
create type appointment_request_status as enum
  ('open', 'accepted', 'rejected', 'cancelled');

create table appointment_requests (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id),
  patient_id          uuid not null references patients (id),
  psychologist_id     uuid not null references profiles (id),
  preferred_starts_at timestamptz not null,
  duration_min        smallint not null default 50 check (duration_min between 15 and 240),
  note                text,
  status              appointment_request_status not null default 'open',
  requested_by        uuid not null,
  decided_by          uuid references profiles (id),
  decided_at          timestamptz,
  created_at          timestamptz not null default now()
);

create index appointment_requests_org_status_idx
  on appointment_requests (organization_id, status);
create index appointment_requests_patient_idx
  on appointment_requests (patient_id);

alter table appointment_requests enable row level security;

-- Paciente cria pedido só para si mesmo
create policy appt_req_patient_insert on appointment_requests for insert
  with check (is_patient_portal_user(patient_id)
              and requested_by = auth.uid());

-- Paciente lê os seus; staff lê os da organização
create policy appt_req_read on appointment_requests for select
  using (is_patient_portal_user(patient_id)
         or organization_id = current_org_id());

-- Staff decide (aceitar/recusar)
create policy appt_req_staff_update on appointment_requests for update
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- Paciente só pode cancelar o próprio pedido enquanto aberto —
-- nunca pode mudar para accepted/rejected por conta própria.
create policy appt_req_patient_cancel on appointment_requests for update
  using (is_patient_portal_user(patient_id) and status = 'open')
  with check (is_patient_portal_user(patient_id) and status = 'cancelled');

grant select, insert, update on appointment_requests to authenticated;
