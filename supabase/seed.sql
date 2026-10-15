-- ============================================================================
-- psystem — Seed de desenvolvimento (massa de dados demo)
-- Roda em: npx supabase db reset
--
-- Conteúdo:
--   - 1 organização (Clínica Demo)
--   - 4 usuários Auth (senha demo123456): 2 psicólogos, 1 recepção, 1 paciente
--   - 10 pacientes, vínculos, prontuários com histórico versionado
--   - 3 salas, disponibilidade semanal, agenda dos próximos dias
--   - cobranças pagas/pendentes/vencidas, pagamento, NFS-e emitida
--   - documento emitido, solicitação de acesso, logs de mensagem
-- ============================================================================

begin;

-- Todos os objetos do app vivem no schema dedicado 'psystem'
-- (o schema public é compartilhado com outro produto no mesmo projeto).
set local search_path = psystem, public;

-- Limpa usuários demo anteriores (criados via API) para seed determinístico.
delete from auth.users
where email in (
  'ana.psi@demo.com', 'bruna.psi@demo.com',
  'recep@demo.com', 'maria.paciente@demo.com',
  'carlos@demo.com'
);

-- ---------------------------------------------------------------------------
-- Organização
-- ---------------------------------------------------------------------------

insert into organizations (id, type, name, slug, document)
values (
  '00000000-0000-0000-0000-000000000001',
  'clinic', 'Clínica Demo', 'clinica-demo', '12.345.678/0001-90'
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Usuários Auth + profiles
--   ana.psi@demo.com      psicóloga (Dra. Ana)
--   bruna.psi@demo.com    psicólogo  (Dr. Bruno)
--   recep@demo.com        recepção   (Recep Silva)
--   maria.paciente@demo   conta de portal da paciente Maria
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        confirmation_token, recovery_token, email_change,
                        email_change_token_new, email_change_token_current,
                        reauthentication_token, phone_change, phone_change_token)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
       u.email, extensions.crypt('demo123456', extensions.gen_salt('bf')),
       now(), now(), now(), '', '', '', '', '', '', '', ''
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid, 'ana.psi@demo.com'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'bruna.psi@demo.com'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'recep@demo.com'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'maria.paciente@demo.com'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'carlos@demo.com')
) as u(id, email)
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '{"sub":"10000000-0000-0000-0000-000000000001","email":"ana.psi@demo.com","email_verified":true}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '{"sub":"10000000-0000-0000-0000-000000000002","email":"bruna.psi@demo.com","email_verified":true}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   '{"sub":"10000000-0000-0000-0000-000000000003","email":"recep@demo.com","email_verified":true}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   '{"sub":"10000000-0000-0000-0000-000000000004","email":"maria.paciente@demo.com","email_verified":true}', 'email', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005',
   '{"sub":"10000000-0000-0000-0000-000000000005","email":"carlos@demo.com","email_verified":true}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into profiles (id, organization_id, role, status, full_name, crp)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'psychologist', 'active', 'Dra. Ana Ribeiro', 'CRP 06/12345'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'psychologist', 'active', 'Dr. Bruno Campos', 'CRP 06/23456'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'receptionist', 'active', 'Silvia Recepção', null),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
   'clinic_admin', 'active', 'Carlos Admin', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Pacientes (Dra. Ana: 1–7 / Dr. Bruno: 8–10)
-- ---------------------------------------------------------------------------

insert into patients (id, organization_id, full_name, cpf, birth_date, phone,
                      email, status, created_by) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Maria Silva',     '123.456.789-01', '1990-03-15', '(11) 98765-1001', 'maria.silva@email.com',     'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'João Pereira',    '234.567.890-12', '1985-07-22', '(11) 98765-1002', 'joao.pereira@email.com',     'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Fernanda Costa',  '345.678.901-23', '1998-11-08', '(11) 98765-1003', 'fernanda.costa@email.com',  'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Carlos Souza',    '456.789.012-34', '1979-01-30', '(11) 98765-1004', 'carlos.souza@email.com',    'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Beatriz Lima',    '567.890.123-45', '2012-05-14', '(11) 98765-1005', 'mae.beatriz@email.com',     'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Pedro Henrique',  '678.901.234-56', '1993-09-02', '(11) 98765-1006', 'pedro.h@email.com',         'paused',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Juliana Rocha',   '789.012.345-67', '1988-12-19', '(11) 98765-1007', 'juliana.rocha@email.com',   'active',   '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Lucas Almeida',   '890.123.456-78', '1995-04-25', '(11) 98765-1008', 'lucas.almeida@email.com',   'active',   '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Rafaela Martins', '901.234.567-89', '2001-08-11', '(11) 98765-1009', 'rafaela.m@email.com',       'active',   '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Tiago Nunes',     '012.345.678-90', '1982-02-17', '(11) 98765-1010', 'tiago.nunes@email.com',     'active',   '10000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- Responsável legal da paciente menor (Beatriz, 2012).
update patients
set guardian = '{"full_name":"Patricia Lima","phone":"(11) 97777-2005","kinship":"mae"}'::jsonb
where id = '20000000-0000-0000-0000-000000000005';

-- Conta de portal da Maria.
insert into patient_accounts (patient_id, user_id)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004')
on conflict (patient_id) do nothing;

-- Vínculos paciente ↔ psicólogo.
insert into patient_links (organization_id, patient_id, psychologist_id, created_by)
select '00000000-0000-0000-0000-000000000001', p.id,
       case when p.id <= '20000000-0000-0000-0000-000000000007'::uuid
            then '10000000-0000-0000-0000-000000000001'::uuid
            else '10000000-0000-0000-0000-000000000002'::uuid end,
       '10000000-0000-0000-0000-000000000001'
from patients p
where p.organization_id = '00000000-0000-0000-0000-000000000001'
  and not exists (
    select 1 from patient_links pl
    where pl.patient_id = p.id and pl.status = 'active'
  );

-- ---------------------------------------------------------------------------
-- Salas e disponibilidade
-- ---------------------------------------------------------------------------

insert into rooms (id, organization_id, name) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sala 1'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sala 2'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sala Infantil')
on conflict (id) do nothing;

-- Seg–Sex, 08–12 e 14–18, para os dois psicólogos.
insert into availability (organization_id, psychologist_id, weekday, start_time, end_time)
select '00000000-0000-0000-0000-000000000001', psy, wd, s.st, s.et
from (values
  ('10000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000002'::uuid)
) as v(psy),
generate_series(1, 5) as wd,
(values ('08:00'::time, '12:00'::time), ('14:00'::time, '18:00'::time)) as s(st, et)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Prontuários + registros versionados
-- ---------------------------------------------------------------------------

insert into clinical_records (id, organization_id, patient_id, demand_summary, objectives)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Paciente relata ansiedade e dificuldades no trabalho após mudança de cargo.',
   'Reduzir sintomas ansiosos; desenvolver estratégias de enfrentamento.'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Demanda por luto recente.',
   'Elaboração do luto; retomada da rotina.'),
  ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003',
   'Insônia e irritabilidade.',
   'Higiene do sono; regulação emocional.'),
  ('60000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008',
   'Dificuldades de relacionamento.',
   'Habilidades sociais e assertividade.')
on conflict (id) do nothing;

-- Registros de atendimento (entry) + versões.
insert into record_entries (id, organization_id, record_id, author_id, entry_type, created_at) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'session', now() - interval '7 days'),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'session', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'session', now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'session', now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'session', now() - interval '2 days')
on conflict (id) do nothing;

insert into record_entry_versions (entry_id, version, content, procedures, change_reason, author_id, created_at) values
  ('70000000-0000-0000-0000-000000000001', 1, 'Paciente compareceu pontualmente. Relatou semana difícil no trabalho, com episódios de ansiedade diante de prazos. Demonstrou boa abertura para o processo.', 'Escuta ativa; psicoeducação sobre ansiedade.', null, '10000000-0000-0000-0000-000000000001', now() - interval '7 days'),
  ('70000000-0000-0000-0000-000000000001', 2, 'Paciente compareceu pontualmente. Relatou semana difícil no trabalho, com episódios de ansiedade diante de prazos e reuniões. Demonstrou boa abertura para o processo e aderiu à proposta de registro de pensamentos.', 'Escuta ativa; psicoeducação sobre ansiedade; introdução ao registro de pensamentos.', 'complemento do registro', '10000000-0000-0000-0000-000000000001', now() - interval '7 days' + interval '2 hours'),
  ('70000000-0000-0000-0000-000000000002', 1, 'Trouxe o registro de pensamentos preenchido. Identificamos padrões de catastrofização. Paciente relatou melhora na percepção dos gatilhos.', 'Revisão do registro; reestruturação cognitiva inicial.', null, '10000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('70000000-0000-0000-0000-000000000003', 1, 'Sessão focada na elaboração do luto. Paciente verbalizou sentimentos de culpa. Momento de acolhimento e validação.', 'Acolhimento; exploração de significados.', null, '10000000-0000-0000-0000-000000000001', now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000004', 1, 'Paciente relatou insônia persistente (latência > 1h). Introduzida rotina de higiene do sono. Combinado diário de sono para próxima sessão.', 'Psicoeducação sobre sono; diário de sono.', null, '10000000-0000-0000-0000-000000000001', now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000005', 1, 'Paciente descreveu conflitos recorrentes com colegas. Trabalhamos identificação de padrões de comunicação passiva.', 'Role-playing; treino de assertividade.', null, '10000000-0000-0000-0000-000000000002', now() - interval '2 days')
on conflict do nothing;

update record_entries set latest_version = 2 where id = '70000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Agenda — hoje, próximos dias e histórico
-- ---------------------------------------------------------------------------

insert into appointments (id, organization_id, patient_id, psychologist_id, room_id,
                          starts_at, ends_at, modality, status, price_cents, created_by) values
  -- Hoje (Dra. Ana)
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', date_trunc('day', now()) + interval '9 hours',  date_trunc('day', now()) + interval '10 hours', 'in_person', 'completed',              20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', date_trunc('day', now()) + interval '10 hours', date_trunc('day', now()) + interval '11 hours', 'in_person', 'confirmed',              20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', date_trunc('day', now()) + interval '14 hours', date_trunc('day', now()) + interval '15 hours', 'online',    'awaiting_confirmation', 18000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', date_trunc('day', now()) + interval '15 hours', date_trunc('day', now()) + interval '16 hours', 'in_person', 'scheduled',              20000, '10000000-0000-0000-0000-000000000003'),
  -- Hoje (Dr. Bruno)
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', date_trunc('day', now()) + interval '9 hours',  date_trunc('day', now()) + interval '10 hours', 'in_person', 'completed',              22000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', null,                                     date_trunc('day', now()) + interval '16 hours', date_trunc('day', now()) + interval '17 hours', 'online',    'confirmed',              22000, '10000000-0000-0000-0000-000000000003'),
  -- Amanhã
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', date_trunc('day', now()) + interval '1 day' + interval '9 hours',  date_trunc('day', now()) + interval '1 day' + interval '10 hours', 'in_person', 'confirmed',              20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', date_trunc('day', now()) + interval '1 day' + interval '10 hours', date_trunc('day', now()) + interval '1 day' + interval '11 hours', 'in_person', 'scheduled',              20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', null,                                     date_trunc('day', now()) + interval '1 day' + interval '14 hours', date_trunc('day', now()) + interval '1 day' + interval '15 hours', 'online',    'awaiting_confirmation', 22000, '10000000-0000-0000-0000-000000000003'),
  -- Depois de amanhã
  ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', date_trunc('day', now()) + interval '2 days' + interval '10 hours', date_trunc('day', now()) + interval '2 days' + interval '11 hours', 'in_person', 'scheduled',              20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', date_trunc('day', now()) + interval '2 days' + interval '15 hours', date_trunc('day', now()) + interval '2 days' + interval '16 hours', 'in_person', 'confirmed',              22000, '10000000-0000-0000-0000-000000000003'),
  -- Histórico (semana passada)
  ('30000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', now() - interval '7 days', now() - interval '7 days' + interval '50 minutes', 'in_person', 'completed', 20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', now() - interval '5 days', now() - interval '5 days' + interval '50 minutes', 'in_person', 'completed', 20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', now() - interval '4 days', now() - interval '4 days' + interval '50 minutes', 'in_person', 'no_show',   20000, '10000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', now() - interval '10 days', now() - interval '10 days' + interval '50 minutes', 'in_person', 'cancelled', 20000, '10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Financeiro: cobranças (paga / pendente / vencida) + pagamento + NFS-e
-- ---------------------------------------------------------------------------

insert into charges (id, organization_id, patient_id, appointment_id, amount_cents,
                     status, due_date, gateway, gateway_id, payment_link_url, created_by) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 20000, 'paid',     current_date,     'demo', 'pay_001', 'https://pay.demo/c/001', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 20000, 'pending',  current_date + 2, 'demo', 'pay_002', 'https://pay.demo/c/002', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000013', 20000, 'paid',     current_date - 4, 'demo', 'pay_003', 'https://pay.demo/c/003', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000014', 20000, 'overdue',  current_date - 2, 'demo', 'pay_004', 'https://pay.demo/c/004', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000005', 22000, 'paid',     current_date,     'demo', 'pay_005', 'https://pay.demo/c/005', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000008', 20000, 'pending',  current_date + 3, 'demo', 'pay_006', 'https://pay.demo/c/006', '10000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000011', 22000, 'overdue',  current_date - 5, 'demo', 'pay_007', 'https://pay.demo/c/007', '10000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

insert into payments (organization_id, charge_id, gateway, gateway_payment_id,
                      amount_cents, method, paid_at, raw) values
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'demo', 'pay_001', 20000, 'pix',         now() - interval '2 hours', '{"event":"payment.confirmed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'demo', 'pay_003', 20000, 'credit_card', now() - interval '4 days',  '{"event":"payment.confirmed"}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000005', 'demo', 'pay_005', 22000, 'pix',         now() - interval '1 hour',  '{"event":"payment.confirmed"}'::jsonb);

insert into invoices (organization_id, charge_id, payment_id, provider,
                      provider_invoice_id, status, number, issued_at)
select '00000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
       p.id, 'demo', 'nfse_001', 'issued', 'NF-2026-0001', now() - interval '1 hour'
from payments p where p.gateway_payment_id = 'pay_001'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Documento + solicitação de acesso + mensagens
-- ---------------------------------------------------------------------------

insert into documents (id, organization_id, patient_id, author_id, type, purpose,
                       recipient_name, recipient_service, status, current_version) values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'referral',
   'Encaminhamento para avaliação psiquiátrica', 'Dr. João Psiquiatra', 'Psiquiatria', 'issued', 1),
  ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'declaration',
   'Declaração de acompanhamento psicológico', null, null, 'draft', 1)
on conflict (id) do nothing;

insert into document_versions (document_id, version, content, created_by, issued_at) values
  ('80000000-0000-0000-0000-000000000001', 1, 'ENCAMINHAMENTO\n\nPaciente: Maria Silva\nData de nascimento: 15/03/1990\n\nProfissional/serviço de destino: Dr. João Psiquiatra — Psiquiatria\n\nMotivo do encaminhamento: avaliação psiquiátrica para complementação do acompanhamento psicológico em curso.\n\nObservações: paciente encontra-se em acompanhamento semanal desde setembro/2026.\n\n_____________________________\nDra. Ana Ribeiro — CRP 06/12345', '10000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('80000000-0000-0000-0000-000000000002', 1, 'DECLARAÇÃO\n\nDeclaro, para os devidos fins, que João Pereira encontra-se em acompanhamento psicológico nesta clínica.\n\n_____________________________\nDra. Ana Ribeiro — CRP 06/12345', '10000000-0000-0000-0000-000000000001', null)
on conflict do nothing;

insert into access_requests (organization_id, patient_id, requested_by,
                             request_type, period, note, status) values
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
   'document', 'último mês', 'Gostaria de receber uma declaração de acompanhamento.', 'open')
on conflict do nothing;

insert into message_logs (organization_id, patient_id, channel, template_key,
                          recipient, status, provider, related_type, related_id, sent_at) values
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'whatsapp', 'appointment_confirmation', '+5511987651001', 'delivered', 'demo', 'appointment', '30000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'whatsapp', 'charge_pending',           '+5511987651002', 'sent',      'demo', 'charge',      '40000000-0000-0000-0000-000000000002', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'email',    'appointment_reminder',     'fernanda.costa@email.com', 'queued', 'demo', 'appointment', '30000000-0000-0000-0000-000000000003', null);

commit;
