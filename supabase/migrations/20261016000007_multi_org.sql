-- Multi-organização (X1): um usuário pode pertencer a várias organizações —
-- ex.: psicólogo com consultório próprio (type 'individual') + clínica onde atende.
--
-- Modelo:
--   organization_members  = fonte da verdade dos vínculos (org, user, role, is_admin)
--   profiles.organization_id / profiles.role = CONTEXTO ATIVO (denormalizado),
--     alterado somente via switch_organization() — nunca por update direto.
--
-- Isso mantém todas as policies existentes válidas (elas leem o contexto ativo)
-- e resolve NFS-e por construção: cada org tem seu próprio CNPJ/emissor.
set search_path to psystem, public;

create table organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references profiles (id) on delete cascade,
  role            member_role not null,
  is_admin        boolean not null default false,
  status          member_status not null default 'active',
  invited_by      uuid references profiles (id),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on organization_members (user_id);

alter table organization_members enable row level security;

-- Backfill: cada profile existente vira membro da própria org.
insert into organization_members (organization_id, user_id, role, status)
select organization_id, id, role, status from profiles;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- O usuário é admin da org ATIVA? (clinic_admin explícito ou is_admin —
-- dono de consultório individual administra a própria org como psicólogo)
create or replace function current_member_is_admin()
returns boolean language sql stable security definer
set search_path = psystem, public as $$
  select exists (
    select 1 from organization_members
    where organization_id = current_org_id()
      and user_id = auth.uid()
      and status = 'active'
      and (role = 'clinic_admin' or is_admin)
  )
$$;

-- Troca o contexto ativo — só para orgs onde o usuário é membro ativo.
create or replace function switch_organization(p_org uuid)
returns void language plpgsql security definer
set search_path = psystem, public as $$
declare
  m organization_members%rowtype;
begin
  select * into m from organization_members
   where organization_id = p_org
     and user_id = auth.uid()
     and status = 'active';
  if not found then
    raise exception 'Organização inválida ou acesso inativo';
  end if;
  update profiles
     set organization_id = p_org,
         role = m.role,
         updated_at = now()
   where id = auth.uid();
end;
$$;

-- Cria o consultório particular do psicólogo (org individual) e alterna para ele.
-- Idempotente: se já existe uma org individual, só alterna.
create or replace function create_own_practice()
returns uuid language plpgsql security definer
set search_path = psystem, public as $$
declare
  v_org uuid;
  v_name text;
begin
  select om.organization_id into v_org
    from organization_members om
    join organizations o on o.id = om.organization_id
   where om.user_id = auth.uid() and om.status = 'active' and o.type = 'individual'
   limit 1;

  if v_org is null then
    select full_name into v_name from profiles where id = auth.uid();
    insert into organizations (type, name, slug)
    values ('individual',
            'Consultório de ' || coalesce(v_name, 'Psicólogo'),
            'consultorio-' || auth.uid())
    returning id into v_org;

    insert into organization_members (organization_id, user_id, role, is_admin, status)
    values (v_org, auth.uid(), 'psychologist', true, 'active');
  end if;

  perform switch_organization(v_org);
  return v_org;
end;
$$;

-- Ativação pós-definição de senha (convite): profile + memberships invited→active.
create or replace function activate_my_account()
returns void language plpgsql security definer
set search_path = psystem, public as $$
begin
  update profiles set status = 'active', updated_at = now()
   where id = auth.uid() and status = 'invited';
  update organization_members set status = 'active'
   where user_id = auth.uid() and status = 'invited';
end;
$$;

-- Bloqueio/reativação de membro na org ativa — somente admin, e não a si mesmo.
-- Válido por org: bloquear na clínica não derruba o consultório particular dele.
create or replace function admin_set_member_status(p_user uuid, p_status member_status)
returns void language plpgsql security definer
set search_path = psystem, public as $$
begin
  if not current_member_is_admin() then
    raise exception 'Somente administradores';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o próprio status';
  end if;
  update organization_members
     set status = p_status
   where organization_id = current_org_id()
     and user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — organization_members
-- ---------------------------------------------------------------------------

-- Usuário lê os próprios vínculos; staff lê vínculos da org ativa.
create policy members_select on organization_members for select
  using (user_id = auth.uid() or organization_id = current_org_id());
-- Sem policies de escrita para authenticated: vínculos nascem via convite
-- (service role) ou via funções acima (security definer).

grant select on organization_members to authenticated;
-- Default privileges do schema concedem ALL em tabelas novas — fechamos a
-- escrita direta: vínculos só mudam via funções acima ou service role.
revoke insert, update, delete on organization_members from authenticated, anon;
revoke delete on appointment_requests from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Ajustes de policies existentes
-- ---------------------------------------------------------------------------

-- Organizações: visível se é a org ativa OU se o usuário é membro
-- (necessário para o seletor de contexto listar as outras orgs).
drop policy org_select on organizations;
create policy org_select on organizations for select
  using (id = current_org_id()
         or exists (select 1 from organization_members om
                    where om.organization_id = organizations.id
                      and om.user_id = auth.uid()));

drop policy org_update on organizations;
create policy org_update on organizations for update
  using (id = current_org_id() and current_member_is_admin());

-- Profiles: visível se pertence à org ativa, é o próprio, ou divide alguma org
-- com o usuário (para listar membros cuja org ativa é outra).
drop policy profiles_select on profiles;
create policy profiles_select on profiles for select
  using (organization_id = current_org_id()
         or id = auth.uid()
         or exists (select 1
                    from organization_members mine
                    join organization_members theirs
                      on theirs.organization_id = mine.organization_id
                    where mine.user_id = auth.uid() and mine.status = 'active'
                      and theirs.user_id = profiles.id
                      and theirs.status = 'active'));

drop policy profiles_insert on profiles;
create policy profiles_insert on profiles for insert
  with check (organization_id = current_org_id() and current_member_is_admin());

-- Split do update: o próprio usuário edita dados pessoais (colunas restritas
-- via grant abaixo); admin edita membros da org — via RPCs, pois mudança de
-- role/status não pode ser feita por update direto.
drop policy profiles_update on profiles;
create policy profiles_self_update on profiles for update
  using (id = auth.uid());
create policy profiles_admin_update on profiles for update
  using (organization_id = current_org_id() and current_member_is_admin())
  with check (organization_id = current_org_id());

-- Privilégios por coluna: fecha auto-promoção de role e troca de organization_id.
revoke update on profiles from authenticated;
grant update (full_name, crp) on profiles to authenticated;

-- admin checks passam a aceitar is_admin (dono de consultório individual).
drop policy rooms_admin_write on rooms;
create policy rooms_admin_write on rooms for all
  using (organization_id = current_org_id() and current_member_is_admin())
  with check (organization_id = current_org_id() and current_member_is_admin());

drop policy availability_write on availability;
create policy availability_write on availability for all
  using (organization_id = current_org_id()
         and (psychologist_id = auth.uid()
              or current_member_is_admin()
              or current_member_role() = 'receptionist'))
  with check (organization_id = current_org_id()
         and (psychologist_id = auth.uid()
              or current_member_is_admin()
              or current_member_role() = 'receptionist'));

drop policy audit_select on audit_logs;
create policy audit_select on audit_logs for select
  using (organization_id = current_org_id()
         and (current_member_is_admin() or user_id = auth.uid()));
