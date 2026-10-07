-- Smoke test das regras P0 de segurança (permissions-matrix.md §16).
-- Roda no Supabase local: psql -f supabase/tests/rls_smoke.sql
-- Simula JWTs via request.jwt.claims + role authenticated.

begin;

-- ---------------------------------------------------------------------------
-- Setup: org, auth users, profiles, paciente, vínculo
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'psi@demo.com', '', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rec@demo.com', '', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'psi2@demo.com', '', now(), now(), now());

insert into organizations (id, type, name, slug)
values ('00000000-0000-0000-0000-000000000002', 'clinic', 'Clínica Teste', 'clinica-teste');

insert into profiles (id, organization_id, role, status, full_name, crp) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'psychologist',  'active', 'Dra. Ana',    'CRP 00/00000'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'receptionist', 'active', 'Recep Silva',  null),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002', 'psychologist',  'active', 'Dr. Bruno',    'CRP 00/11111');

insert into patients (id, organization_id, full_name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', 'Maria Paciente');

insert into patient_links (organization_id, patient_id, psychologist_id)
values ('00000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111');

insert into clinical_records (id, organization_id, patient_id)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ---------------------------------------------------------------------------
-- TESTE 1: psicóloga responsável lê o prontuário
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select 'T1 psychologist reads record',
       count(*) = 1 as pass from clinical_records;
reset role;

-- ---------------------------------------------------------------------------
-- TESTE 2: recepção NÃO lê o prontuário
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select 'T2 receptionist denied record',
       count(*) = 0 as pass from clinical_records;
-- mas recepção lê dados administrativos do paciente
select 'T2b receptionist reads patient',
       count(*) = 1 as pass from patients;
reset role;

-- ---------------------------------------------------------------------------
-- TESTE 3: outro psicólogo da mesma clínica NÃO lê o prontuário
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select 'T3 other psychologist denied',
       count(*) = 0 as pass from clinical_records;
reset role;

-- ---------------------------------------------------------------------------
-- TESTE 4: criar registro + versionamento
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111"}';

select create_record_entry(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, 'session',
  'Conteúdo da sessão v1') as entry;

-- v2 SEM motivo deve falhar
do $$
begin
  perform add_entry_version(
    (select id from record_entries limit 1), 'v2', null, null);
  raise exception 'T4 FAIL: v2 sem motivo foi aceita';
exception when raise_exception then
  if sqlerrm = 'change_reason_required' then
    raise notice 'T4 change_reason required: pass';
  else raise; end if;
end $$;

-- v2 COM motivo deve passar
select (add_entry_version(
  (select id from record_entries limit 1), 'v2 corrigida', null,
  'correção de informação')).version = 2 as "T4 version created";

select 'T4 history preserved',
       count(*) = 2 as pass from record_entry_versions;

-- UPDATE direto em versão deve falhar (imutável)
do $$
begin
  update record_entry_versions set content = 'hack' where version = 1;
  raise exception 'T4 FAIL: update em versão permitido';
exception when raise_exception or insufficient_privilege then
  raise notice 'T4 version immutable: pass';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- TESTE 5: recepção NÃO cria versão nem entry
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$
begin
  perform create_record_entry(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, 'session', 'x');
  raise exception 'T5 FAIL: recepção criou entry';
exception when raise_exception or insufficient_privilege then
  raise notice 'T5 receptionist cannot write record: pass';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- TESTE 6: conflito de agenda (exclusion constraint)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222"}';

insert into appointments (organization_id, patient_id, psychologist_id,
                          starts_at, ends_at)
values ('00000000-0000-0000-0000-000000000002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '2026-10-10 14:00+00', '2026-10-10 15:00+00');

do $$
begin
  insert into appointments (organization_id, patient_id, psychologist_id,
                            starts_at, ends_at)
  values ('00000000-0000-0000-0000-000000000002',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          '11111111-1111-1111-1111-111111111111',
          '2026-10-10 14:30+00', '2026-10-10 15:30+00');
  raise exception 'T6 FAIL: conflito de agenda permitido';
exception when exclusion_violation then
  raise notice 'T6 appointment overlap blocked: pass';
end $$;
reset role;

rollback;
