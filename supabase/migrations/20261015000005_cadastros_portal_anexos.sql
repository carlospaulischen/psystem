-- Cadastros completos + confirmação pelo portal + anexos.
-- 1. Consentimento LGPD do paciente (ET-021).
-- 2. RPC para o paciente confirmar presença (portal não tem policy de UPDATE).
-- 3. Anexos administrativos do paciente (storage privado + metadados).

alter table patients
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

-- O paciente só pode marcar 'confirmed' — qualquer outra mudança exige staff.
create or replace function confirm_own_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update appointments
    set status = 'confirmed', updated_at = now()
    where id = p_appointment_id
      and status in ('scheduled', 'awaiting_confirmation')
      and is_patient_portal_user(patient_id);

  if not found then
    raise exception 'not_allowed';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anexos do paciente (documentos enviados, exames, autorizações…)
-- Metadados em tabela; binário no bucket privado 'patient-files'.
-- Caminho do objeto: {organization_id}/{patient_id}/{uuid}-{nome}
-- ---------------------------------------------------------------------------

create table if not exists patient_attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id),
  patient_id      uuid not null references patients (id),
  file_path       text not null,
  file_name       text not null,
  mime_type       text,
  size_bytes      bigint,
  uploaded_by     uuid references profiles (id),
  created_at      timestamptz not null default now()
);

create index if not exists patient_attachments_patient_idx
  on patient_attachments (patient_id);

alter table patient_attachments enable row level security;

-- Somente staff da org. Paciente não vê (pode conter autorização digitalizada
-- que a clínica controla; expor no portal depois via flag se necessário).
create policy attachments_staff on patient_attachments for all
  using (organization_id = current_org_id())
  with check (organization_id = current_org_id());

-- Bucket privado + policies de storage restritas à pasta da própria org.
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false)
on conflict (id) do nothing;

create policy patient_files_staff_select on storage.objects for select
  using (bucket_id = 'patient-files'
         and (storage.foldername(name))[1] = current_org_id()::text);

create policy patient_files_staff_insert on storage.objects for insert
  with check (bucket_id = 'patient-files'
              and (storage.foldername(name))[1] = current_org_id()::text);

create policy patient_files_staff_delete on storage.objects for delete
  using (bucket_id = 'patient-files'
         and (storage.foldername(name))[1] = current_org_id()::text);
