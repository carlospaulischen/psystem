-- ============================================================================
-- psystem — Row Level Security
-- Implementa: isolamento por organização (ET-029/030), separação
-- administrativo/clínico (ET-006/007/028), vínculo psicólogo-paciente (ET-008),
-- imutabilidade de versões e auditoria (ET-004/013/017).
--
-- Regra: a permissão vive no banco. Esconder botão não basta — sem policy,
-- a resposta é denial em qualquer cliente (permissions-matrix.md §15).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers (security definer evita recursão ao consultar profiles)
-- ---------------------------------------------------------------------------

create or replace function current_org_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select organization_id from profiles
  where id = auth.uid() and status = 'active'
$$;

create or replace function current_member_role()
returns member_role language sql stable security definer
set search_path = public as $$
  select role from profiles
  where id = auth.uid() and status = 'active'
$$;

-- ABAC: usuário é o psicólogo responsável (vínculo ativo) por este paciente?
create or replace function is_responsible_psychologist(p_patient_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from patient_links
    where patient_id = p_patient_id
      and psychologist_id = auth.uid()
      and status = 'active'
  )
$$;

-- Usuário autenticado é a conta de portal deste paciente?
create or replace function is_patient_portal_user(p_patient_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from patient_accounts
    where patient_id = p_patient_id
      and user_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table organizations          enable row level security;
alter table profiles               enable row level security;
alter table patients               enable row level security;
alter table patient_accounts       enable row level security;
alter table patient_links          enable row level security;
alter table rooms                  enable row level security;
alter table availability           enable row level security;
alter table appointments           enable row level security;
alter table clinical_records       enable row level security;
alter table record_entries         enable row level security;
alter table record_entry_versions  enable row level security;
alter table documents              enable row level security;
alter table document_versions      enable row level security;
alter table document_deliveries    enable row level security;
alter table charges                enable row level security;
alter table payments               enable row level security;
alter table invoices               enable row level security;
alter table access_requests        enable row level security;
alter table message_logs           enable row level security;
alter table audit_logs             enable row level security;

-- ---------------------------------------------------------------------------
-- Organizations & profiles
-- ---------------------------------------------------------------------------

create policy org_select on organizations for select
  using (id = current_org_id());

create policy org_update on organizations for update
  using (id = current_org_id() and current_member_role() = 'clinic_admin');

create policy profiles_select on profiles for select
  using (organization_id = current_org_id());

create policy profiles_insert on profiles for insert
  with check (organization_id = current_org_id() and current_member_role() = 'clinic_admin');

create policy profiles_update on profiles for update
  using (organization_id = current_org_id()
         and (current_member_role() = 'clinic_admin' or id = auth.uid()));
-- Sem DELETE: desligamento é inativação (ET-019).

-- ---------------------------------------------------------------------------
-- Patients — dados administrativos acessíveis ao staff; nunca cross-org
-- ---------------------------------------------------------------------------

create policy patients_staff_select on patients for select
  using (organization_id = current_org_id()
         or is_patient_portal_user(id));

create policy patients_staff_insert on patients for insert
  with check (organization_id = current_org_id());

create policy patients_staff_update on patients for update
  using (organization_id = current_org_id());
-- Sem DELETE: paciente é arquivado, não apagado (ET-018).

create policy patient_accounts_self on patient_accounts for select
  using (user_id = auth.uid() or exists (
    select 1 from patients p
    where p.id = patient_accounts.patient_id
      and p.organization_id = current_org_id()
  ));

create policy patient_accounts_insert on patient_accounts for insert
  with check (exists (
    select 1 from patients p
    where p.id = patient_accounts.patient_id
      and p.organization_id = current_org_id()
  ));

-- ---------------------------------------------------------------------------
-- Patient links (vínculo)
-- ---------------------------------------------------------------------------

create policy links_staff on patient_links for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

create policy rooms_select on rooms for select
  using (organization_id = current_org_id());

create policy rooms_admin_write on rooms for all
  using (organization_id = current_org_id() and current_member_role() = 'clinic_admin')
  with check (organization_id = current_org_id() and current_member_role() = 'clinic_admin');

create policy availability_select on availability for select
  using (organization_id = current_org_id());

create policy availability_write on availability for all
  using (organization_id = current_org_id()
         and (psychologist_id = auth.uid() or current_member_role() in ('clinic_admin', 'receptionist')))
  with check (organization_id = current_org_id()
         and (psychologist_id = auth.uid() or current_member_role() in ('clinic_admin', 'receptionist')));

create policy appointments_staff on appointments for select
  using (organization_id = current_org_id()
         or is_patient_portal_user(patient_id));

create policy appointments_insert on appointments for insert
  with check (organization_id = current_org_id());

create policy appointments_update on appointments for update
  using (organization_id = current_org_id());
-- Sem DELETE: cancelamento é mudança de status.

-- ---------------------------------------------------------------------------
-- Clinical records — SOMENTE psicólogo com vínculo ativo (ET-001/008)
-- Admin e recepção não possuem policy = acesso negado por construção.
-- ---------------------------------------------------------------------------

create policy records_select on clinical_records for select
  using (is_responsible_psychologist(patient_id));

create policy records_insert on clinical_records for insert
  with check (organization_id = current_org_id()
              and current_member_role() = 'psychologist'
              and is_responsible_psychologist(patient_id));

create policy records_update on clinical_records for update
  using (is_responsible_psychologist(patient_id));

create policy entries_select on record_entries for select
  using (exists (
    select 1 from clinical_records r
    where r.id = record_entries.record_id
      and is_responsible_psychologist(r.patient_id)
  ));

create policy entries_insert on record_entries for insert
  with check (organization_id = current_org_id()
              and current_member_role() = 'psychologist'
              and author_id = auth.uid()
              and exists (
                select 1 from clinical_records r
                where r.id = record_entries.record_id
                  and is_responsible_psychologist(r.patient_id)
              ));
-- record_entries não tem policy de UPDATE/DELETE direta;
-- latest_version é atualizado por add_entry_version() (security definer).

create policy versions_select on record_entry_versions for select
  using (exists (
    select 1 from record_entries e
    join clinical_records r on r.id = e.record_id
    where e.id = record_entry_versions.entry_id
      and is_responsible_psychologist(r.patient_id)
  ));
-- Sem INSERT direto: versões são criadas exclusivamente por add_entry_version(),
-- que valida autorização, motivo da alteração e incrementa latest_version.

-- ---------------------------------------------------------------------------
-- Documents — somente psicólogo com vínculo (ET-011..014)
-- Paciente só vê o que foi formalmente entregue a ele.
-- ---------------------------------------------------------------------------

create policy documents_psych on documents for select
  using (is_responsible_psychologist(patient_id)
         or (status = 'delivered' and is_patient_portal_user(patient_id)));

create policy documents_insert on documents for insert
  with check (organization_id = current_org_id()
              and current_member_role() = 'psychologist'
              and author_id = auth.uid()
              and is_responsible_psychologist(patient_id));

create policy documents_update on documents for update
  using (is_responsible_psychologist(patient_id));
-- Sem DELETE: invalidar, não apagar (ET-013).

create policy doc_versions_select on document_versions for select
  using (exists (
    select 1 from documents d
    where d.id = document_versions.document_id
      and (is_responsible_psychologist(d.patient_id)
           or (d.status = 'delivered' and is_patient_portal_user(d.patient_id)))
  ));

create policy doc_versions_insert on document_versions for insert
  with check (exists (
    select 1 from documents d
    where d.id = document_versions.document_id
      and is_responsible_psychologist(d.patient_id)
  ));
-- Versões são imutáveis (grant abaixo reforça).

create policy deliveries_select on document_deliveries for select
  using (exists (
    select 1 from documents d
    where d.id = document_deliveries.document_id
      and is_responsible_psychologist(d.patient_id)
  ));

create policy deliveries_insert on document_deliveries for insert
  with check (exists (
    select 1 from documents d
    where d.id = document_deliveries.document_id
      and is_responsible_psychologist(d.patient_id)
  ));

-- ---------------------------------------------------------------------------
-- Financial — staff lê/escreve; paciente vê o próprio
-- ---------------------------------------------------------------------------

create policy charges_staff_select on charges for select
  using (organization_id = current_org_id()
         or is_patient_portal_user(patient_id));

create policy charges_insert on charges for insert
  with check (organization_id = current_org_id());

create policy charges_update on charges for update
  using (organization_id = current_org_id());

create policy payments_select on payments for select
  using (organization_id = current_org_id()
         or exists (
           select 1 from charges c
           where c.id = payments.charge_id
             and is_patient_portal_user(c.patient_id)
         ));
-- INSERT/UPDATE de payments: apenas service role (webhook do gateway).

create policy invoices_select on invoices for select
  using (organization_id = current_org_id()
         or exists (
           select 1 from charges c
           where c.id = invoices.charge_id
             and is_patient_portal_user(c.patient_id)
         ));

create policy invoices_write on invoices for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- ---------------------------------------------------------------------------
-- Access requests (ET-003)
-- ---------------------------------------------------------------------------

create policy access_requests_patient on access_requests for insert
  with check (is_patient_portal_user(patient_id)
              and requested_by = auth.uid());

create policy access_requests_patient_read on access_requests for select
  using (organization_id = current_org_id()
         or is_patient_portal_user(patient_id));

create policy access_requests_staff_update on access_requests for update
  using (organization_id = current_org_id()
         and current_member_role() = 'psychologist'
         and is_responsible_psychologist(patient_id));

-- ---------------------------------------------------------------------------
-- Message logs — staff lê; escrita via service/app
-- ---------------------------------------------------------------------------

create policy message_logs_staff on message_logs for select
  using (organization_id = current_org_id());

create policy message_logs_insert on message_logs for insert
  with check (organization_id = current_org_id());

-- ---------------------------------------------------------------------------
-- Audit logs (ET-017) — append-only
-- Psicólogo/recepção veem os próprios eventos; admin vê eventos da org.
-- Conteúdo clínico não vaza: log guarda IDs/ações, não conteúdo.
-- ---------------------------------------------------------------------------

create policy audit_select on audit_logs for select
  using (organization_id = current_org_id()
         and (current_member_role() = 'clinic_admin' or user_id = auth.uid()));

create policy audit_insert on audit_logs for insert
  with check (organization_id = current_org_id() or current_org_id() is null);

-- ---------------------------------------------------------------------------
-- Imutabilidade reforçada por grants (além da ausência de policies)
-- ---------------------------------------------------------------------------

revoke update, delete on record_entry_versions from authenticated, anon;
revoke update, delete on document_versions   from authenticated, anon;
revoke update, delete on document_deliveries from authenticated, anon;
revoke update, delete on audit_logs          from authenticated, anon;
revoke delete on payments                    from authenticated, anon;
