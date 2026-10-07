-- Seed mínimo para desenvolvimento local.
-- Usuários de auth devem ser criados pelo Supabase Dashboard ou pela
-- tela de cadastro; aqui criamos apenas a organização de demonstração.
--
-- Depois de criar o primeiro usuário no Auth, vincule-o:
--   insert into profiles (id, organization_id, role, status, full_name)
--   values ('<auth_user_id>', '<org_id>', 'clinic_admin', 'active', 'Admin');
-- ou use o script docs/onboarding (a criar no fluxo de cadastro).

insert into organizations (id, type, name, slug)
values (
  '00000000-0000-0000-0000-000000000001',
  'clinic',
  'Clínica Demo',
  'clinica-demo'
) on conflict (id) do nothing;
